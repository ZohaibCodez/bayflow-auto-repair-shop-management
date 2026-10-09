import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { getCallForUser } from "@/server/services/calls";

/** GET /api/calls/:callId — call state for the people on it (both sides poll). */
export const GET = apiRoute(async (_req: Request, ctx: RouteContext<"/api/calls/[callId]">) => {
  const { callId } = await ctx.params;
  const user = await requireUser();
  return NextResponse.json({ call: await getCallForUser(user.id, callId) }, { headers: { "cache-control": "no-store" } });
});
