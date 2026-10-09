import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireShopAccess } from "@/lib/rbac";
import { getTeam } from "@/server/queries/shop";

/** Owner / service advisor: the shop's team (for assignment pickers). GET /api/shops/:shopId/team */
export const GET = apiRoute(async (_req: Request, ctx: RouteContext<"/api/shops/[shopId]/team">) => {
  const { shopId } = await ctx.params;
  await requireShopAccess(shopId, ["OWNER", "SERVICE_ADVISOR"]);
  const team = await getTeam(shopId);
  return NextResponse.json({
    members: team.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      active: m.active,
    })),
  });
});
