import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { answerCall } from "@/server/services/calls";

/** POST /api/calls/:callId/answer { answer } — first advisor to answer wins (409 for the rest). */
export const POST = apiRoute(async (req: Request, ctx: RouteContext<"/api/calls/[callId]/answer">) => {
  const { callId } = await ctx.params;
  const user = await requireUser();
  const { answer } = z.object({ answer: z.string() }).parse(await req.json().catch(() => ({})));
  await answerCall(user.id, callId, answer);
  return NextResponse.json({ ok: true });
});
