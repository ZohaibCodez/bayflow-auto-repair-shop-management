import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireShopAccess } from "@/lib/rbac";
import { completeAiTask } from "@/server/services/frontdesk";

/** POST /api/shops/:shopId/ai-tasks/:taskId/done — advisor marks an AI follow-up done. */
export const POST = apiRoute(async (_req: Request, ctx: RouteContext<"/api/shops/[shopId]/ai-tasks/[taskId]/done">) => {
  const { shopId, taskId } = await ctx.params;
  const { user } = await requireShopAccess(shopId, ["OWNER", "SERVICE_ADVISOR"]);
  await completeAiTask(user.id, shopId, taskId);
  return NextResponse.json({ ok: true });
});
