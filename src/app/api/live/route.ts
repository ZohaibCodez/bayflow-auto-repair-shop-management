import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireBookingAccess, requireShopAccess, requireUser } from "@/lib/rbac";

/**
 * GET /api/live?shopId=… | ?bookingId=… | ?mine=1
 * A cheap "version" of what a screen shows (latest update time + count). Screens poll it
 * and refresh only when it changes, so a second browser sees another role's step within
 * seconds. Same access rules as the screens themselves.
 */
const query = z.object({
  shopId: z.string().optional(),
  bookingId: z.string().optional(),
  mine: z.string().optional(),
});

export const GET = apiRoute(async (req: Request) => {
  const q = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  let v = "";

  if (q.bookingId) {
    const { booking } = await requireBookingAccess(q.bookingId);
    const b = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { updatedAt: true, _count: { select: { events: true, callLogs: true } } },
    });
    v = `${b?.updatedAt.getTime()}:${b?._count.events}:${b?._count.callLogs}`;
  } else if (q.shopId) {
    await requireShopAccess(q.shopId);
    const agg = await prisma.booking.aggregate({
      where: { shopId: q.shopId },
      _max: { updatedAt: true },
      _count: { _all: true },
    });
    const tasks = await prisma.aiTask.count({ where: { shopId: q.shopId, done: false } });
    v = `${agg._max.updatedAt?.getTime() ?? 0}:${agg._count._all}:${tasks}`;
  } else if (q.mine) {
    const user = await requireUser();
    const agg = await prisma.booking.aggregate({
      where: { customerId: user.id },
      _max: { updatedAt: true },
      _count: { _all: true },
    });
    v = `${agg._max.updatedAt?.getTime() ?? 0}:${agg._count._all}`;
  }

  return NextResponse.json({ v }, { headers: { "cache-control": "no-store" } });
});
