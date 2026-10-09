import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { createBooking, createBookingSchema } from "@/server/services/bookings";

/**
 * POST /api/bookings — a signed-in customer books a slot (same rules as the wizard:
 * slot must be a real, future, non-full slot of that shop; capacity is enforced atomically,
 * so concurrent requests for the last place get 409).
 * GET  /api/bookings — the signed-in customer's own bookings.
 */
const body = createBookingSchema.omit({ customer: true });

export const POST = apiRoute(async (req: Request) => {
  const user = await requireUser();
  const input = body.parse(await req.json().catch(() => ({})));
  const booking = await createBooking({ ...input, customer: { kind: "session", userId: user.id } });
  return NextResponse.json({ booking: { id: booking.id, code: booking.code, status: "PENDING" } }, { status: 201 });
});

export const GET = apiRoute(async () => {
  const user = await requireUser();
  const rows = await prisma.booking.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
      shop: { select: { id: true, name: true } },
      slot: { select: { startsAt: true } },
      vehicle: { select: { plate: true, make: true, model: true } },
    },
  });
  return NextResponse.json({ bookings: rows });
});

