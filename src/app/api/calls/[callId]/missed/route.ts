import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { markMissed } from "@/server/services/calls";

/** POST /api/calls/:callId/missed */
export const POST = apiRoute(async (_req: Request, ctx: RouteContext<"/api/calls/[callId]/missed">) => {
  const { callId } = await ctx.params;
  const user = await requireUser();
  await markMissed(user.id, callId);
  return NextResponse.json({ ok: true });
});
