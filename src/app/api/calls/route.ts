import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { startCall } from "@/server/services/calls";

/** POST /api/calls { bookingId, offer } — start an in-app call about a booking. */
export const POST = apiRoute(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const call = await startCall(user.id, body);
  return NextResponse.json(call, { status: 201 });
});
