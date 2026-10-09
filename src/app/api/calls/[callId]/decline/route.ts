import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { declineCall } from "@/server/services/calls";

/** POST /api/calls/:callId/decline */
export const POST = apiRoute(async (_req: Request, ctx: RouteContext<"/api/calls/[callId]/decline">) => {
  const { callId } = await ctx.params;
  const user = await requireUser();
  await declineCall(user.id, callId);
  return NextResponse.json({ ok: true });
});
