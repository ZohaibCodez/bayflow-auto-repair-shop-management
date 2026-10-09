import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { canViewBooking, requireShopAccess } from "@/lib/rbac";
import { availableActions } from "@/lib/booking/state-machine";
import { getBookingDetail } from "@/server/queries/bookings";

/**
 * GET /api/shops/:shopId/bookings/:bookingId
 * 403 if you aren't staff of :shopId; 404 if the booking belongs to another shop
 * (or is a job a technician isn't assigned to) — guessing IDs reveals nothing.
 */
export const GET = apiRoute(async (_req: Request, ctx: RouteContext<"/api/shops/[shopId]/bookings/[bookingId]">) => {
  const { shopId, bookingId } = await ctx.params;
  const { actor } = await requireShopAccess(shopId);
  const b = await getBookingDetail(bookingId);
  if (!b || b.shopId !== shopId || !canViewBooking(actor, b)) throw notFound("Booking not found.");

  const estimate = b.estimates[0];
  return NextResponse.json({
    booking: {
      id: b.id,
      code: b.code,
      status: b.status,
      shop: b.shop.name,
      customer: { name: b.customer.name, email: b.customer.email },
      vehicle: { plate: b.vehicle.plate, make: b.vehicle.make, model: b.vehicle.model, year: b.vehicle.year },
      appointment: b.slot?.startsAt ?? null,
      services: b.serviceNames,
      problems: b.problems,
      technician: b.assignedTech?.name ?? null,
      estimate: estimate
        ? {
            revision: estimate.revision,
            status: estimate.status,
            total: estimate.items.reduce((s, i) => s + i.qty * i.unitCost, 0),
            items: estimate.items.map(({ kind, name, qty, unitCost }) => ({ kind, name, qty, unitCost })),
          }
        : null,
      qcInspector: b.qcInspector?.name ?? null,
      openIssues: b.issues.filter((i) => !i.resolved).map((i) => ({ title: i.title, description: i.description })),
      parts: b.allocations.map((a) => ({
        sku: a.inventoryItem.sku,
        name: a.inventoryItem.name,
        qty: a.qty,
        status: a.status,
      })),
      purchaseOrders: b.purchaseOrders.map((po) => ({
        id: po.id,
        status: po.status,
        items: po.items,
      })),
      history: b.timeline.map((e) => ({
        from: e.fromStatus,
        to: e.toStatus,
        by: e.actorName,
        role: e.actorRole,
        note: e.note,
        at: e.createdAt,
      })),
    },
    allowedActions: availableActions(b, actor),
  });
});
