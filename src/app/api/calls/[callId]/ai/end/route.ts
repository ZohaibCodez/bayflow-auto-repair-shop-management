import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { finishFrontDesk } from "@/server/services/frontdesk";

/** POST /api/calls/:callId/ai/end — hang up on the AI: summary + advisor task. */
export const POST = apiRoute(async (_req: Request, ctx: RouteContext<"/api/calls/[callId]/ai/end">) => {
  const { callId } = await ctx.params;
  const user = await requireUser();
  return NextResponse.json(await finishFrontDesk(user.id, callId));
});
