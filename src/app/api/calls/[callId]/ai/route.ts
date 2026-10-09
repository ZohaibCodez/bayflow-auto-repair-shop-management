import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { frontDeskTurn, startFrontDesk } from "@/server/services/frontdesk";

/**
 * POST /api/calls/:callId/ai { text? } — AI Front Desk for a customer call nobody answered.
 * Without text: the greeting. With text: one conversational turn.
 */
export const POST = apiRoute(async (req: Request, ctx: RouteContext<"/api/calls/[callId]/ai">) => {
  const { callId } = await ctx.params;
  const user = await requireUser();
  const { text } = z.object({ text: z.string().max(1000).optional() }).parse(await req.json().catch(() => ({})));
  const result = text?.trim() ? await frontDeskTurn(user.id, callId, text) : await startFrontDesk(user.id, callId);
  return NextResponse.json(result);
});
