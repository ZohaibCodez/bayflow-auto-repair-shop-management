import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { incomingCalls } from "@/server/services/calls";

/** GET /api/calls/incoming — calls ringing for the signed-in user (popup). */
export const GET = apiRoute(async () => {
  const user = await requireUser();
  return NextResponse.json({ calls: await incomingCalls(user.id) }, { headers: { "cache-control": "no-store" } });
});
