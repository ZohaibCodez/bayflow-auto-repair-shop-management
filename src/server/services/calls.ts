import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, forbidden, notFound } from "@/lib/errors";
import { advisorIds, customerHref, loadShopAccess, notify, staffHref } from "./common";

/**
 * In-app voice calls between a booking's customer and the shop's service advisors
 * (brief §8.1). Media is browser-to-browser WebRTC; this service is the signalling and the
 * call log. Signalling is non-trickle: the caller stores its complete SDP offer, the callee
 * its answer, and both sides poll — no websocket server needed (works on serverless).
 *
 * Customer → shop calls ring every service advisor (and the owner). If nobody answers within
 * RING_SECONDS, or an advisor declines, the call is "missed" and the AI Front Desk takes it.
 */

export const RING_SECONDS = 20;
const STALE_RING_MS = (RING_SECONDS + 10) * 1000;

export type CallState = "ringing" | "connected" | "ended" | "missed" | "declined";

const sdp = z.string().min(10).max(20_000);

/** Who may receive calls for a shop: active service advisors + the owner. */
async function isShopAdvisor(userId: string, shopId: string) {
  const access = await loadShopAccess(userId, shopId);
  return !!access && (access.isOwner || access.roles.includes("SERVICE_ADVISOR"));
}

/** Ringing calls nobody picked up are missed — expire them lazily on read. */
async function expireStaleRings(where: Prisma.CallLogWhereInput = {}) {
  await prisma.callLog.updateMany({
    where: { ...where, state: "ringing", startedAt: { lt: new Date(Date.now() - STALE_RING_MS) } },
    data: { state: "missed", outcome: "missed", endedAt: new Date() },
  });
}

export const startCallSchema = z.object({ bookingId: z.string().min(1), offer: sdp });

/** Start a call about a booking. The caller's side decides the direction. */
export async function startCall(userId: string, raw: z.input<typeof startCallSchema>) {
  const input = startCallSchema.parse(raw);
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true, code: true, shopId: true, customerId: true, customer: { select: { name: true } } },
  });
  if (!booking) throw notFound("Booking not found.");

  let direction: "CUSTOMER_TO_SA" | "SA_TO_CUSTOMER";
  let toUserId: string | null;
  if (booking.customerId === userId) {
    direction = "CUSTOMER_TO_SA";
    toUserId = null; // ring every advisor of the shop
  } else if (await isShopAdvisor(userId, booking.shopId)) {
    direction = "SA_TO_CUSTOMER";
    toUserId = booking.customerId;
  } else {
    throw notFound("Booking not found.");
  }

  // One live call per booking at a time.
  await expireStaleRings({ bookingId: booking.id });
  const live = await prisma.callLog.count({
    where: { bookingId: booking.id, state: { in: ["ringing", "connected"] } },
  });
  if (live) throw conflict("There's already a call in progress for this booking.");

  const call = await prisma.callLog.create({
    data: {
      shopId: booking.shopId,
      bookingId: booking.id,
      direction,
      fromUserId: userId,
      toUserId,
      state: "ringing",
      offer: input.offer,
    },
    select: { id: true },
  });
  return { callId: call.id, direction, ringSeconds: RING_SECONDS };
}

/** Calls ringing for this user right now (popup). */
export async function incomingCalls(userId: string) {
  await expireStaleRings();
  const [owned, memberships] = await Promise.all([
    prisma.shop.findMany({ where: { ownerId: userId }, select: { id: true } }),
    prisma.membership.findMany({
      where: { userId, active: true, role: "SERVICE_ADVISOR" },
      select: { shopId: true },
    }),
  ]);
  const advisorShops = [...owned.map((s) => s.id), ...memberships.map((m) => m.shopId)];

  const calls = await prisma.callLog.findMany({
    where: {
      state: "ringing",
      fromUserId: { not: userId },
      OR: [
        { toUserId: userId },
        { toUserId: null, direction: "CUSTOMER_TO_SA", shopId: { in: advisorShops } },
      ],
    },
    orderBy: { startedAt: "asc" },
    take: 3,
    select: {
      id: true,
      direction: true,
      offer: true,
      startedAt: true,
      fromUser: { select: { name: true } },
      shop: { select: { name: true } },
      booking: { select: { id: true, code: true, vehicle: { select: { make: true, model: true, plate: true } } } },
      shopId: true,
    },
  });
  return calls.map((c) => ({
    id: c.id,
    direction: c.direction,
    offer: c.offer,
    startedAt: c.startedAt,
    from: c.fromUser?.name ?? "Unknown caller",
    shopName: c.shop.name,
    bookingCode: c.booking?.code ?? null,
    vehicle: c.booking ? `${c.booking.vehicle.make} ${c.booking.vehicle.model} · ${c.booking.vehicle.plate}` : null,
    href:
      c.booking && c.direction === "CUSTOMER_TO_SA"
        ? staffHref(c.shopId, c.booking.id)
        : c.booking
          ? customerHref(c.booking.id)
          : null,
  }));
}

/** Can this user answer this call? (the addressed customer, or an advisor of the shop) */
async function canAnswer(userId: string, call: { toUserId: string | null; shopId: string; direction: string }) {
  if (call.toUserId) return call.toUserId === userId;
  return call.direction === "CUSTOMER_TO_SA" && (await isShopAdvisor(userId, call.shopId));
}

async function loadCall(id: string) {
  const call = await prisma.callLog.findUnique({ where: { id } });
  if (!call) throw notFound("Call not found.");
  return call;
}

/** Answer: first advisor to answer wins (compare-and-set on state). */
export async function answerCall(userId: string, callId: string, answer: string) {
  sdp.parse(answer);
  const call = await loadCall(callId);
  if (!(await canAnswer(userId, call))) throw forbidden("This call isn't for you.");
  const res = await prisma.callLog.updateMany({
    where: { id: callId, state: "ringing" },
    data: { state: "connected", answer, answeredById: userId, answeredAt: new Date(), outcome: "answered" },
  });
  if (res.count !== 1) throw conflict("This call was already answered or has ended.");
}

/** Decline from the receiving side → missed (a customer's call then goes to the AI Front Desk). */
export async function declineCall(userId: string, callId: string) {
  const call = await loadCall(callId);
  if (!(await canAnswer(userId, call))) throw forbidden("This call isn't for you.");
  await prisma.callLog.updateMany({
    where: { id: callId, state: "ringing" },
    data: { state: "declined", outcome: "declined", endedAt: new Date() },
  });
}

/** Caller gave up waiting (ring timeout). */
export async function markMissed(userId: string, callId: string) {
  const call = await loadCall(callId);
  if (call.fromUserId !== userId) throw forbidden("Only the caller can do that.");
  await prisma.callLog.updateMany({
    where: { id: callId, state: "ringing" },
    data: { state: "missed", outcome: "missed", endedAt: new Date() },
  });
  if (call.direction === "CUSTOMER_TO_SA") {
    const booking = call.bookingId
      ? await prisma.booking.findUnique({ where: { id: call.bookingId }, select: { code: true } })
      : null;
    await notify(prisma, {
      userIds: await advisorIds(prisma, call.shopId),
      type: "CALL_MISSED",
      message: `Missed call from a customer${booking ? ` about ${booking.code}` : ""} — the AI Front Desk picked it up`,
      bookingId: call.bookingId ?? undefined,
      href: call.bookingId ? staffHref(call.shopId, call.bookingId) : undefined,
    });
  }
}

/** Hang up. Ends a connected call (records duration) or cancels a ringing one. */
export async function endCall(userId: string, callId: string) {
  const call = await loadCall(callId);
  const party = call.fromUserId === userId || call.answeredById === userId || call.toUserId === userId;
  if (!party) throw forbidden("You're not on this call.");
  const now = new Date();
  if (call.state === "connected") {
    await prisma.callLog.updateMany({
      where: { id: callId, state: "connected" },
      data: {
        state: "ended",
        endedAt: now,
        durationSec: call.answeredAt ? Math.round((+now - +call.answeredAt) / 1000) : 0,
      },
    });
  } else if (call.state === "ringing") {
    await prisma.callLog.updateMany({
      where: { id: callId, state: "ringing" },
      data: { state: "missed", outcome: "missed", endedAt: now },
    });
  }
}

/** Polled by both sides during a call. */
export async function getCallForUser(userId: string, callId: string) {
  await expireStaleRings({ id: callId });
  const call = await prisma.callLog.findUnique({
    where: { id: callId },
    include: {
      fromUser: { select: { name: true } },
      answeredBy: { select: { name: true } },
      shop: { select: { name: true } },
      booking: { select: { code: true } },
    },
  });
  if (!call) throw notFound("Call not found.");
  const party =
    call.fromUserId === userId ||
    call.answeredById === userId ||
    call.toUserId === userId ||
    (await canAnswer(userId, call));
  if (!party) throw notFound("Call not found.");
  return {
    id: call.id,
    state: call.state as CallState,
    direction: call.direction,
    answer: call.fromUserId === userId ? call.answer : null,
    answeredBy: call.answeredBy?.name ?? null,
    from: call.fromUser?.name ?? null,
    shopName: call.shop.name,
    bookingCode: call.booking?.code ?? null,
    aiHandled: call.aiHandled,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt,
  };
}
