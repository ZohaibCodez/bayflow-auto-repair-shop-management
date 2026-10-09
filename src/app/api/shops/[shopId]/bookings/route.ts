import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { apiRoute } from "@/lib/api";
import { requireShopAccess } from "@/lib/rbac";
import { listShopBookings } from "@/server/queries/bookings";

const query = z.object({
  status: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",") : []))
    .pipe(z.array(z.enum(BookingStatus))),
  q: z.string().max(60).optional(),
});

/**
 * GET /api/shops/:shopId/bookings[?status=PENDING,QC_PENDING][&q=civic]
 * Staff of the shop only (403 otherwise). Technicians receive only their assigned jobs.
 */
export const GET = apiRoute(async (req: Request, ctx: RouteContext<"/api/shops/[shopId]/bookings">) => {
  const { shopId } = await ctx.params;
  const { actor } = await requireShopAccess(shopId);
  const { status, q } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await listShopBookings(shopId, actor, { statuses: status, q });
  return NextResponse.json({
    bookings: rows.map((b) => ({
      id: b.id,
      code: b.code,
      status: b.status,
      customer: b.customer.name,
      vehicle: b.vehicle,
      appointment: b.slot?.startsAt ?? null,
      technician: b.assignedTech?.name ?? null,
      updatedAt: b.updatedAt,
    })),
  });
});
