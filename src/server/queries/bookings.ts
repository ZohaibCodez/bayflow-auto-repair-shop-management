import "server-only";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/booking/state-machine";
import { partsRequirement } from "@/server/services/parts";

/** Read models for the booking screens. Every query is scoped by shop (and by assignee for techs). */

export async function getBookingDetail(bookingId: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      shop: { select: { id: true, name: true, city: true, phone: true, address: true } },
      slot: { select: { startsAt: true } },
      customer: { select: { id: true, name: true, email: true, phone: true } },
      vehicle: true,
      assignedTech: { select: { id: true, name: true } },
      partsPerson: { select: { id: true, name: true } },
      qcInspector: { select: { id: true, name: true } },
      estimates: {
        orderBy: { revision: "desc" },
        include: { items: { orderBy: { kind: "desc" } }, createdBy: { select: { name: true } } },
      },
      events: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { actor: { select: { name: true } } } },
      issues: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      allocations: { include: { inventoryItem: { select: { sku: true, name: true } } } },
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        include: { items: { select: { id: true, name: true, qtyOrdered: true, qtyReceived: true } } },
      },
    },
  });
  if (!b) return null;
  const needsParts: BookingStatus[] = ["PARTS_PENDING", "PARTS_ORDERED", "PARTS_READY"];
  const requirement = needsParts.includes(b.status) ? await partsRequirement(prisma, b.id) : [];
  return {
    ...b,
    requirement,
    timeline: b.events.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorName: e.actor?.name ?? null,
      actorRole: e.actorRole,
      note: e.note,
      createdAt: e.createdAt,
    })),
  };
}
export type BookingDetail = NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>;

const LIST_INCLUDE = {
  customer: { select: { name: true } },
  vehicle: { select: { plate: true, make: true, model: true, year: true } },
  slot: { select: { startsAt: true } },
  assignedTech: { select: { name: true } },
  qcInspector: { select: { id: true, name: true } },
  estimates: {
    orderBy: { revision: "desc" as const },
    take: 1,
    select: { items: { select: { qty: true, unitCost: true } } },
  },
  issues: { where: { resolved: false }, select: { id: true } },
} satisfies Prisma.BookingInclude;

export type BookingRow = Prisma.BookingGetPayload<{ include: typeof LIST_INCLUDE }>;

/**
 * Bookings visible to this actor in this shop. SA / Owner / Parts / QC see the whole shop;
 * a technician sees only bookings assigned to them (brief §4 access rules).
 */
export async function listShopBookings(
  shopId: string,
  actor: Actor,
  opts: { statuses?: BookingStatus[]; q?: string; take?: number } = {},
) {
  const seesAll =
    actor.isOwner || actor.roles.some((r) => r === "SERVICE_ADVISOR" || r === "PARTS" || r === "QC");
  const where: Prisma.BookingWhereInput = {
    shopId,
    ...(seesAll ? {} : { assignedTechId: actor.userId }),
    ...(opts.statuses?.length ? { status: { in: opts.statuses } } : {}),
    ...(opts.q
      ? {
          OR: [
            { code: { contains: opts.q, mode: "insensitive" } },
            { customer: { name: { contains: opts.q, mode: "insensitive" } } },
            { vehicle: { plate: { contains: opts.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  return prisma.booking.findMany({
    where,
    include: LIST_INCLUDE,
    orderBy: [{ updatedAt: "desc" }],
    take: opts.take ?? 100,
  });
}

/** Status counts for the shop (owner/advisor overview, filter chips). */
export async function statusCounts(shopId: string, actor?: Actor) {
  const techOnly =
    actor &&
    !actor.isOwner &&
    !actor.roles.some((r) => r === "SERVICE_ADVISOR" || r === "PARTS" || r === "QC");
  const rows = await prisma.booking.groupBy({
    by: ["status"],
    where: { shopId, ...(techOnly ? { assignedTechId: actor!.userId } : {}) },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<
    Record<BookingStatus, number>
  >;
}

export async function getCustomerBookings(customerId: string) {
  return prisma.booking.findMany({
    where: { customerId },
    include: {
      shop: { select: { id: true, name: true, city: true } },
      vehicle: { select: { plate: true, make: true, model: true, year: true } },
      slot: { select: { startsAt: true } },
      estimates: {
        orderBy: { revision: "desc" },
        take: 1,
        select: { status: true, items: { select: { qty: true, unitCost: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
