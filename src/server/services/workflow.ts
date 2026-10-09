import { z } from "zod";
import { actsAs, type Actor } from "@/lib/booking/state-machine";
import { conflict, forbidden, invalid, isAppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import {
  advisorIds,
  customerHref,
  isActiveMember,
  notify,
  staffHref,
  staffWithRole,
  type Tx,
} from "./common";
import { releaseSlot } from "./bookings";
import { releaseReservedParts } from "./parts";
import { loadBooking, transition, type LockedBooking } from "./transition";

/**
 * One function per step of the booking lifecycle (brief §5.2). Each runs in a single DB
 * transaction: guarded status change (via `transition`) + side effects + notifications,
 * so a step either fully happens or not at all.
 */

type Ref = { shopId: string; bookingId: string };
const note = z.string().trim().max(1000).optional();

// ---------------------------------------------------------------------------
// Front desk
// ---------------------------------------------------------------------------

export async function confirmBooking(actor: Actor, input: Ref & { technicianId?: string; note?: string }) {
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, { ...input, action: "confirm", actor, note: input.note });
    await notify(tx, {
      userIds: [booking.customerId],
      type: "BOOKING_CONFIRMED",
      message: `Your booking ${booking.code} is confirmed`,
      bookingId: booking.id,
      href: customerHref(booking.id),
    });
    if (input.technicianId) await doAssignTechnician(tx, actor, input, input.technicianId, booking);
  });
}

export async function declineBooking(actor: Actor, input: Ref & { reason?: string }) {
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "decline",
      actor,
      note: input.reason || "Declined by the shop",
      patch: { notes: input.reason || null },
    });
    await releaseSlot(tx, booking.slotId);
    await notify(tx, {
      userIds: [booking.customerId],
      type: "BOOKING_DECLINED",
      message: `The shop couldn't take booking ${booking.code}${input.reason ? `: ${input.reason}` : ""}`,
      bookingId: booking.id,
      href: customerHref(booking.id),
    });
  });
}

async function doAssignTechnician(
  tx: Tx,
  actor: Actor,
  input: Ref,
  technicianId: string,
  booking?: LockedBooking,
) {
  if (!(await isActiveMember(tx, input.shopId, technicianId, "TECHNICIAN"))) {
    throw invalid("Pick a technician from this shop's team.");
  }
  const tech = await tx.user.findUnique({ where: { id: technicianId }, select: { name: true } });
  const { booking: b } = await transition(tx, {
    ...input,
    action: "assignTechnician",
    actor,
    booking,
    note: `Assigned to ${tech?.name}`,
    patch: { assignedTechId: technicianId },
  });
  await notify(tx, {
    userIds: [technicianId],
    type: "TECH_ASSIGNED",
    message: `You've been assigned ${b.code}`,
    bookingId: b.id,
    href: staffHref(input.shopId, b.id),
  });
}

export async function assignTechnician(actor: Actor, input: Ref & { technicianId: string }) {
  return prisma.$transaction((tx) => doAssignTechnician(tx, actor, input, input.technicianId));
}

// ---------------------------------------------------------------------------
// Inspection & estimate
// ---------------------------------------------------------------------------

export async function startInspection(actor: Actor, input: Ref) {
  return prisma.$transaction(async (tx) => {
    await transition(tx, { ...input, action: "startInspection", actor });
  });
}

const money = z.coerce.number().int("Use whole rupees").min(0).max(10_000_000);
export const estimateItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PART"),
    inventoryItemId: z.string().min(1, "Pick a part"),
    qty: z.coerce.number().int().min(1).max(100),
    unitCost: money,
  }),
  z.object({
    kind: z.literal("LABOR"),
    name: z.string().trim().min(1, "Describe the labour").max(120),
    qty: z.coerce.number().int().min(1).max(100),
    unitCost: money,
  }),
]);
export const estimateItemsSchema = z
  .array(estimateItemSchema)
  .min(1, "Add at least one part or labour line")
  .max(50);
export type EstimateItemInput = z.input<typeof estimateItemSchema>;

async function latestEstimate(tx: Tx, bookingId: string) {
  return tx.estimate.findFirst({
    where: { bookingId },
    orderBy: { revision: "desc" },
    include: { items: true },
  });
}

type Line = { kind: "PART" | "LABOR"; name: string; qty: number; unitCost: number; inventoryItemId: string | null };
const sameLines = (a: Line[], b: Line[]) =>
  JSON.stringify(a.map((l) => [l.kind, l.inventoryItemId, l.name, l.qty, l.unitCost])) ===
  JSON.stringify(b.map((l) => [l.kind, l.inventoryItemId, l.name, l.qty, l.unitCost]));

/** Resolve inventory names and make sure every PART belongs to this shop. */
async function toLines(tx: Tx, shopId: string, raw: EstimateItemInput[]): Promise<Line[]> {
  const items = estimateItemsSchema.parse(raw);
  const partIds = items.flatMap((i) => (i.kind === "PART" ? [i.inventoryItemId] : []));
  const inv = await tx.inventoryItem.findMany({
    where: { shopId, id: { in: partIds } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(inv.map((i) => [i.id, i.name]));
  return items.map((i) => {
    if (i.kind === "LABOR") {
      return { kind: "LABOR", name: i.name, qty: i.qty, unitCost: i.unitCost, inventoryItemId: null };
    }
    const name = nameOf.get(i.inventoryItemId);
    if (!name) throw invalid("One of the parts isn't in this shop's inventory.");
    return { kind: "PART", name, qty: i.qty, unitCost: i.unitCost, inventoryItemId: i.inventoryItemId };
  });
}

/**
 * Write the draft estimate. The technician edits it while INSPECTING; the SA edits it in
 * ESTIMATE_REVIEW, and every SA change bumps `revision` (brief §7.5 revision count).
 */
async function writeDraft(tx: Tx, actor: Actor, b: LockedBooking, raw: EstimateItemInput[]) {
  const isTech = b.status === "INSPECTING" && actsAs("ASSIGNED_TECH", actor, b);
  const isAdvisor = b.status === "ESTIMATE_REVIEW" && actsAs("ADVISOR", actor, b);
  if (!isTech && !isAdvisor) {
    throw forbidden(
      b.status === "INSPECTING" || b.status === "ESTIMATE_REVIEW"
        ? "Your role can't edit this estimate."
        : "The estimate can't be edited at this stage.",
    );
  }
  const lines = await toLines(tx, b.shopId, raw);
  const current = await latestEstimate(tx, b.id);

  if (!current || current.status !== "DRAFT") {
    // First estimate, or a new version after a rejection.
    return tx.estimate.create({
      data: {
        bookingId: b.id,
        revision: (current?.revision ?? 0) + 1,
        createdById: actor.userId,
        items: { create: lines },
      },
      select: { id: true, revision: true },
    });
  }
  if (sameLines(current.items, lines)) return { id: current.id, revision: current.revision };
  await tx.estimateItem.deleteMany({ where: { estimateId: current.id } });
  return tx.estimate.update({
    where: { id: current.id },
    data: {
      items: { create: lines },
      // Technician drafts are revision N; each advisor edit counts as a new revision.
      revision: isAdvisor ? { increment: 1 } : undefined,
    },
    select: { id: true, revision: true },
  });
}

export async function saveEstimateDraft(actor: Actor, input: Ref & { items: EstimateItemInput[] }) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    return writeDraft(tx, actor, b, input.items);
  });
}

/** Technician: save the itemised estimate and hand it to the SA. */
export async function submitEstimate(
  actor: Actor,
  input: Ref & { items: EstimateItemInput[]; note?: string },
) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    await writeDraft(tx, actor, b, input.items);
    const total = await estimateTotal(tx, b.id);
    await transition(tx, {
      ...input,
      action: "submitEstimate",
      actor,
      booking: b,
      note: input.note || `Estimate ${formatPKR(total)}`,
    });
    await notify(tx, {
      userIds: await advisorIds(tx, input.shopId),
      type: "ESTIMATE_SUBMITTED",
      message: `Estimate for ${b.code} is ready for review (${formatPKR(total)})`,
      bookingId: b.id,
      href: staffHref(input.shopId, b.id),
      exceptUserId: actor.userId,
    });
  });
}

async function estimateTotal(tx: Tx, bookingId: string) {
  const e = await latestEstimate(tx, bookingId);
  return e ? e.items.reduce((s, i) => s + i.qty * i.unitCost, 0) : 0;
}

/** SA: optionally adjust the lines, then send the estimate to the customer. */
export async function sendEstimate(
  actor: Actor,
  input: Ref & { items?: EstimateItemInput[]; note?: string },
) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    if (input.items) await writeDraft(tx, actor, b, input.items);
    const est = await latestEstimate(tx, b.id);
    if (!est || est.status !== "DRAFT" || !est.items.length) {
      throw conflict("There's no draft estimate to send.");
    }
    const total = est.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
    await transition(tx, {
      ...input,
      action: "sendEstimate",
      actor,
      booking: b,
      note: input.note || `Sent estimate v${est.revision} — ${formatPKR(total)}`,
    });
    await tx.estimate.update({ where: { id: est.id }, data: { status: "SENT", sentAt: new Date() } });
    await notify(tx, {
      userIds: [b.customerId],
      type: "ESTIMATE_SENT",
      message: `Your estimate for ${b.code} is ready: ${formatPKR(total)}. Please review it.`,
      bookingId: b.id,
      href: customerHref(b.id),
    });
  });
}

/** Customer: accept or reject the estimate. Stamped with respondedAt (the in-app timestamp). */
export async function respondToEstimate(
  actor: Actor,
  input: Ref & { decision: "approve" | "reject"; note?: string },
) {
  const reason = note.parse(input.note);
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    const est = await latestEstimate(tx, b.id);
    if (!est || est.status !== "SENT") throw conflict("There's no estimate waiting for a decision.");
    const approve = input.decision === "approve";
    const total = est.items.reduce((s, i) => s + i.qty * i.unitCost, 0);

    await transition(tx, {
      ...input,
      action: approve ? "approveEstimate" : "rejectEstimate",
      actor,
      booking: b,
      note: approve ? `Approved ${formatPKR(total)}` : reason || "Estimate rejected",
    });
    await tx.estimate.update({
      where: { id: est.id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        respondedAt: new Date(),
        customerNote: approve ? null : reason || null,
      },
    });
    await notify(tx, {
      userIds: await advisorIds(tx, input.shopId),
      type: approve ? "ESTIMATE_APPROVED" : "ESTIMATE_REJECTED",
      message: approve
        ? `Customer approved the estimate for ${b.code} (${formatPKR(total)})`
        : `Customer rejected the estimate for ${b.code}${reason ? `: “${reason}”` : ""}`,
      bookingId: b.id,
      href: staffHref(input.shopId, b.id),
    });
  });
}

/** After a rejection, start a new estimate version from the rejected one. */
async function newVersionFromRejected(tx: Tx, actorId: string, bookingId: string) {
  const prev = await latestEstimate(tx, bookingId);
  if (!prev || prev.status !== "REJECTED") return;
  await tx.estimate.create({
    data: {
      bookingId,
      revision: prev.revision + 1,
      createdById: actorId,
      items: {
        create: prev.items.map(({ kind, name, qty, unitCost, inventoryItemId }) => ({
          kind,
          name,
          qty,
          unitCost,
          inventoryItemId,
        })),
      },
    },
  });
}

/** SA revises the rejected estimate themselves (→ ESTIMATE_REVIEW, new version). */
export async function reviseEstimate(actor: Actor, input: Ref & { note?: string }) {
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "reviseEstimate",
      actor,
      note: input.note || "Revising the estimate",
    });
    await newVersionFromRejected(tx, actor.userId, booking.id);
  });
}

/** SA sends the job back to the technician to re-inspect / re-quote (→ INSPECTING). */
export async function returnToTechnician(actor: Actor, input: Ref & { note?: string }) {
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "returnToTechnician",
      actor,
      note: input.note || "Returned to technician to revise the estimate",
    });
    await newVersionFromRejected(tx, actor.userId, booking.id);
    if (booking.assignedTechId) {
      await notify(tx, {
        userIds: [booking.assignedTechId],
        type: "ESTIMATE_RETURNED",
        message: `${booking.code}: the advisor sent the estimate back to you${input.note ? ` — ${input.note}` : ""}`,
        bookingId: booking.id,
        href: staffHref(input.shopId, booking.id),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Parts hand-off
// ---------------------------------------------------------------------------

export async function assignPartsPerson(actor: Actor, input: Ref & { partsPersonId: string }) {
  return prisma.$transaction(async (tx) => {
    if (!(await isActiveMember(tx, input.shopId, input.partsPersonId, "PARTS"))) {
      throw invalid("Pick a parts person from this shop's team.");
    }
    const person = await tx.user.findUnique({ where: { id: input.partsPersonId }, select: { name: true } });
    const { booking } = await transition(tx, {
      ...input,
      action: "assignParts",
      actor,
      note: `Parts handed to ${person?.name}`,
      patch: { partsPersonId: input.partsPersonId },
    });
    await notify(tx, {
      userIds: [input.partsPersonId],
      type: "PARTS_NEEDED",
      message: `Parts needed for ${booking.code}`,
      bookingId: booking.id,
      href: staffHref(input.shopId, booking.id),
    });
  });
}

// ---------------------------------------------------------------------------
// Repair & QC
// ---------------------------------------------------------------------------

export async function sendToQc(actor: Actor, input: Ref & { note?: string }) {
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "sendToQc",
      actor,
      note: input.note || "Repair done — sent to QC",
      patch: { qcInspectorId: null },
    });
    // Rework done: the issues raised by the last QC are now addressed.
    await tx.issue.updateMany({
      where: { bookingId: booking.id, resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    });
    await notify(tx, {
      userIds: await staffWithRole(tx, input.shopId, "QC"),
      type: "QC_QUEUED",
      message: `${booking.code} is waiting in the QC queue`,
      bookingId: booking.id,
      href: staffHref(input.shopId, booking.id),
    });
  });
}

/**
 * Pick a job from the shared QC queue. First to pick locks it: `transition` updates
 * `WHERE status = 'QC_PENDING'`, so a second inspector racing for the same job gets a conflict.
 */
export async function claimQc(actor: Actor, input: Ref) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    if (b.status === "QC_IN_PROGRESS" && b.qcInspectorId !== actor.userId) {
      throw conflict("Another inspector already picked this job.");
    }
    try {
      await transition(tx, {
        ...input,
        action: "claimQc",
        actor,
        booking: b,
        patch: { qcInspectorId: actor.userId },
      });
    } catch (e) {
      if (isAppError(e) && e.code === "CONFLICT") {
        throw conflict("Another inspector just picked this job.");
      }
      throw e;
    }
  });
}

export async function passQc(actor: Actor, input: Ref & { note?: string }) {
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "passQc",
      actor,
      note: input.note || "Passed quality check",
    });
    await notify(tx, {
      userIds: await advisorIds(tx, input.shopId),
      type: "QC_PASSED",
      message: `${booking.code} passed QC — ready to notify the customer`,
      bookingId: booking.id,
      href: staffHref(input.shopId, booking.id),
    });
  });
}

export const qcIssueSchema = z.object({
  title: z.string().trim().min(3, "Give the issue a short title").max(120),
  description: z.string().trim().max(2000).optional(),
});

/** Failed QC: record an Issue and return the job to the same technician (brief §5.3 loop). */
export async function failQc(actor: Actor, input: Ref & z.input<typeof qcIssueSchema>) {
  const issue = qcIssueSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "failQc",
      actor,
      note: `QC failed: ${issue.title}`,
      patch: { qcInspectorId: null }, // next QC round is open to any inspector again
    });
    await tx.issue.create({
      data: {
        bookingId: booking.id,
        title: issue.title,
        description: issue.description || null,
        createdById: actor.userId,
      },
    });
    if (booking.assignedTechId) {
      await notify(tx, {
        userIds: [booking.assignedTechId],
        type: "QC_FAILED",
        message: `${booking.code} failed QC: ${issue.title}`,
        bookingId: booking.id,
        href: staffHref(input.shopId, booking.id),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Hand-back
// ---------------------------------------------------------------------------

export async function notifyReady(actor: Actor, input: Ref & { message?: string }) {
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "notifyReady",
      actor,
      note: "Customer notified: vehicle ready for pick-up",
    });
    await notify(tx, {
      userIds: [booking.customerId],
      type: "READY_FOR_PICKUP",
      message: input.message?.trim() || `Your vehicle is ready for pick-up (${booking.code})`,
      bookingId: booking.id,
      href: customerHref(booking.id),
    });
  });
}

export async function completeBooking(actor: Actor, input: Ref) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    const { booking } = await transition(tx, {
      ...input,
      action: "complete",
      actor,
      booking: b,
      note: actor.userId === b.customerId ? "Picked up by customer" : "Vehicle handed over",
    });
    await notify(tx, {
      userIds: [booking.customerId, ...(await advisorIds(tx, input.shopId))],
      type: "COMPLETED",
      message: `${booking.code} is complete — thanks for choosing us`,
      bookingId: booking.id,
      exceptUserId: actor.userId,
    });
  });
}

/** Cancel before IN_REPAIR (customer or SA): releases reserved parts and the slot. */
export async function cancelBooking(actor: Actor, input: Ref & { reason?: string }) {
  const reason = note.parse(input.reason);
  return prisma.$transaction(async (tx) => {
    const { booking } = await transition(tx, {
      ...input,
      action: "cancel",
      actor,
      note: reason || "Booking cancelled",
      patch: { notes: reason || null },
    });
    const released = await releaseReservedParts(tx, input.shopId, booking.id, actor.userId);
    await releaseSlot(tx, booking.slotId);
    const byCustomer = actor.userId === booking.customerId;
    await notify(tx, {
      userIds: byCustomer
        ? [
            ...(await advisorIds(tx, input.shopId)),
            ...(booking.assignedTechId ? [booking.assignedTechId] : []),
            ...(booking.partsPersonId ? [booking.partsPersonId] : []),
          ]
        : [booking.customerId],
      type: "CANCELLED",
      message: byCustomer
        ? `Customer cancelled ${booking.code}${released ? " — reserved parts returned to stock" : ""}`
        : `Your booking ${booking.code} was cancelled${reason ? `: ${reason}` : ""}`,
      bookingId: booking.id,
      href: byCustomer ? staffHref(input.shopId, booking.id) : customerHref(booking.id),
    });
  });
}
