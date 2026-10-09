import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { endCall } from "@/server/services/calls";

/** POST /api/calls/:callId/end */
export const POST = apiRoute(async (_req: Request, ctx: RouteContext<"/api/calls/[callId]/end">) => {
  const { callId } = await ctx.params;
  const user = await requireUser();
  await endCall(user.id, callId);
  return NextResponse.json({ ok: true });
});
