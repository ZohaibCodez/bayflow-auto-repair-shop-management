import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireShopAccess } from "@/lib/rbac";
import { getInventory } from "@/server/queries/shop";

/** Owner / parts staff: the shop's stock. GET /api/shops/:shopId/inventory */
export const GET = apiRoute(async (_req: Request, ctx: RouteContext<"/api/shops/[shopId]/inventory">) => {
  const { shopId } = await ctx.params;
  await requireShopAccess(shopId, ["OWNER", "PARTS"]);
  const items = await getInventory(shopId);
  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      qtyOnHand: i.qtyOnHand,
      reserved: i.allocations.reduce((s, a) => s + a.qty, 0),
      onOrder: i.poItems.reduce((s, p) => s + p.qtyOrdered - p.qtyReceived, 0),
      reorderLevel: i.reorderLevel,
      unitCost: i.unitCost,
    })),
  });
});
