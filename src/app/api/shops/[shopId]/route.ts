import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";

/** Public: a shop's profile and bookable services. GET /api/shops/:shopId */
export const GET = apiRoute(async (_req: Request, ctx: RouteContext<"/api/shops/[shopId]">) => {
  const { shopId } = await ctx.params;
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      phone: true,
      description: true,
      rating: true,
      workingHours: true,
      slotDurationMin: true,
      slotCapacity: true,
      services: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, description: true, durationMin: true, basePrice: true },
      },
    },
  });
  if (!shop) throw notFound("Shop not found.");
  return NextResponse.json({ shop });
});
