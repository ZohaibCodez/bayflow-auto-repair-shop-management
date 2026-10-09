import type { Prisma, StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/booking/state-machine";

/**
 * Shared plumbing for the domain services. Services take an explicit `Actor` and never
 * import Next.js, so the same code runs from server actions, route handlers and the seed.
 */

export type Tx = Prisma.TransactionClient;

/** The user's standing in one shop (owner flag + active roles), or null if none. */
export async function loadShopAccess(userId: string, shopId: string, db: Tx = prisma) {
  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      city: true,
      ownerId: true,
      memberships: { where: { userId, active: true }, select: { role: true } },
    },
  });
  if (!shop) return null;
  const isOwner = shop.ownerId === userId;
  const roles = shop.memberships.map((m) => m.role);
  if (!isOwner && roles.length === 0) return null;
  return {
    shop: { id: shop.id, name: shop.name, city: shop.city, ownerId: shop.ownerId },
    isOwner,
    roles,
  };
}

export async function loadActor(userId: string, shopId: string, db: Tx = prisma): Promise<Actor> {
  const access = await loadShopAccess(userId, shopId, db);
  return { userId, isOwner: access?.isOwner ?? false, roles: access?.roles ?? [] };
}

/** Active staff of a shop with a given role. */
export async function staffWithRole(db: Tx, shopId: string, role: StaffRole) {
  const rows = await db.membership.findMany({
    where: { shopId, role, active: true },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

/** Service advisors of the shop; falls back to the owner when a shop has none. */
export async function advisorIds(db: Tx, shopId: string) {
  const ids = await staffWithRole(db, shopId, "SERVICE_ADVISOR");
  if (ids.length) return ids;
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { ownerId: true } });
  return shop ? [shop.ownerId] : [];
}

/** Throws unless `userId` is an active member of `shopId` with `role` (blocks cross-tenant assignment). */
export async function isActiveMember(db: Tx, shopId: string, userId: string, role: StaffRole) {
  const m = await db.membership.findFirst({
    where: { shopId, userId, role, active: true },
    select: { id: true },
  });
  return Boolean(m);
}

export const staffHref = (shopId: string, bookingId: string) =>
  `/pos/${shopId}/bookings/${bookingId}`;
export const customerHref = (bookingId: string) => `/account/bookings/${bookingId}`;

/** In-app notifications (bell). The actor never notifies themselves. */
export async function notify(
  db: Tx,
  input: {
    userIds: string[];
    type: string;
    message: string;
    bookingId?: string;
    href?: string;
    exceptUserId?: string;
  },
) {
  const ids = [...new Set(input.userIds)].filter((id) => id && id !== input.exceptUserId);
  if (!ids.length) return;
  await db.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: input.type,
      message: input.message,
      bookingId: input.bookingId,
      href: input.href,
    })),
  });
}

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I
export function newBookingCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `BF-${s}`;
}
