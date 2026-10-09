import { NextResponse } from "next/server";
import { z } from "zod";
import { isAppError } from "@/lib/errors";
import { getAvailability } from "@/server/services/bookings";

const query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use ?date=YYYY-MM-DD") });

/** Public: bookable slots for a shop on a shop-local date. GET /api/shops/:shopId/availability?date=2026-10-12 */
export async function GET(req: Request, ctx: RouteContext<"/api/shops/[shopId]/availability">) {
  const { shopId } = await ctx.params;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }
  try {
    const slots = await getAvailability(shopId, parsed.data.date);
    return NextResponse.json({ date: parsed.data.date, slots });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
