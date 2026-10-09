import "server-only";
import { cache } from "react";
import type { StaffRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, notFound, unauthenticated } from "@/lib/errors";
import type { Actor } from "@/lib/booking/state-machine";
import { loadShopAccess } from "@/server/services/common";

/**
 * Tenant isolation lives here.
 *
 * A shopId may arrive from the URL (the owner's shop switcher needs that), but it is
 * NEVER trusted: every shop-scoped page, action and API route calls `requireShopAccess`,
 * which proves the signed-in user owns the shop or holds an active membership in it.
 * Shop-owned records are then always fetched with `where: { id, shopId }`, so an ID from
 * another tenant simply isn't found.
 */

export type SessionUser = { id: string; name: string; email: string };

/** The signed-in user, re-read from the DB (so deleted users lose access immediately). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

export type ShopAccess = {
  shop: { id: string; name: string; city: string; ownerId: string };
  isOwner: boolean;
  roles: StaffRole[];
};

/** The user's standing in one shop, or null if they have none. Memoized per request. */
export const getShopAccess = cache(
  (userId: string, shopId: string): Promise<ShopAccess | null> => loadShopAccess(userId, shopId),
);

export type ShopRole = StaffRole | "OWNER";

/**
 * Require the current user to belong to `shopId`, optionally with one of `roles`
 * ("OWNER" matches the shop owner). Throws 401 / 403 otherwise.
 */
export async function requireShopAccess(shopId: string, roles?: readonly ShopRole[]) {
  const user = await requireUser();
  const access = await getShopAccess(user.id, shopId);
  if (!access) throw forbidden("You don't have access to this shop.");
  if (roles && !hasShopRole(access, roles)) {
    throw forbidden("Your role in this shop can't do that.");
  }
  return { user, access, actor: toActor(user.id, access) };
}

export function hasShopRole(access: ShopAccess, roles: readonly ShopRole[]) {
  return roles.some((r) => (r === "OWNER" ? access.isOwner : access.roles.includes(r)));
}

export function toActor(userId: string, access: ShopAccess | null): Actor {
  return { userId, isOwner: access?.isOwner ?? false, roles: access?.roles ?? [] };
}

/**
 * Load a booking the user is allowed to see, scoped by shop:
 * customers see their own bookings, SA/Owner/QC/Parts see the shop's,
 * technicians see only bookings assigned to them.
 */
export async function requireBookingAccess(bookingId: string) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      shopId: true,
      status: true,
      customerId: true,
      assignedTechId: true,
      partsPersonId: true,
      qcInspectorId: true,
    },
  });
  if (!booking) throw notFound("Booking not found.");

  const access = await getShopAccess(user.id, booking.shopId);
  const actor = toActor(user.id, access);
  if (!canViewBooking(actor, booking)) throw notFound("Booking not found.");
  return { user, booking, access, actor };
}

export function canViewBooking(
  actor: Actor,
  b: { customerId: string; assignedTechId: string | null },
): boolean {
  if (b.customerId === actor.userId) return true;
  if (actor.isOwner) return true;
  const r = actor.roles;
  if (r.includes("SERVICE_ADVISOR") || r.includes("QC") || r.includes("PARTS")) return true;
  return r.includes("TECHNICIAN") && b.assignedTechId === actor.userId;
}

/** Every shop the user can open in the POS (owned + active memberships), for the switcher. */
export async function getStaffShops(userId: string) {
  const [owned, memberships] = await Promise.all([
    prisma.shop.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, city: true, createdAt: true },
    }),
    prisma.membership.findMany({
      where: { userId, active: true },
      select: { role: true, shop: { select: { id: true, name: true, city: true, createdAt: true } } },
    }),
  ]);
  type Entry = { id: string; name: string; city: string; createdAt: Date; roles: ShopRole[] };
  const byId = new Map<string, Entry>();
  for (const s of owned) byId.set(s.id, { ...s, roles: ["OWNER"] });
  for (const m of memberships) {
    const entry = byId.get(m.shop.id) ?? { ...m.shop, roles: [] };
    entry.roles.push(m.role);
    byId.set(m.shop.id, entry);
  }
  return [...byId.values()]
    .sort((a, b) => +a.createdAt - +b.createdAt)
    .map(({ createdAt: _c, ...s }) => s);
}
