import type { BookingStatus, Prisma } from "@prisma/client";
import {
  actsAs,
  authorize,
  TRANSITIONS,
  type Action,
  type Actor,
  type BookingRef,
  type Party,
} from "@/lib/booking/state-machine";
import { AppError, conflict, notFound } from "@/lib/errors";
import type { Tx } from "./common";

const BOOKING_REF_SELECT = {
  id: true,
  code: true,
  shopId: true,
  status: true,
  customerId: true,
  assignedTechId: true,
  partsPersonId: true,
  qcInspectorId: true,
  slotId: true,
} as const;

export type LockedBooking = BookingRef & {
  id: string;
  code: string;
  shopId: string;
  slotId: string | null;
};

/** Load a booking scoped to its shop — an ID from another tenant is "not found". */
export async function loadBooking(tx: Tx, shopId: string, bookingId: string) {
  const b = await tx.booking.findFirst({
    where: { id: bookingId, shopId },
    select: BOOKING_REF_SELECT,
  });
  if (!b) throw notFound("Booking not found.");
  return b as LockedBooking;
}

/** The role label written to the audit log for this actor performing this action. */
function actingRole(action: Action, b: BookingRef, actor: Actor): string {
  const party = TRANSITIONS[action].by.find((p) => actsAs(p, actor, b)) as Party;
  const map: Record<Party, string> = {
    ADVISOR: actor.roles.includes("SERVICE_ADVISOR") ? "SERVICE_ADVISOR" : "OWNER",
    ASSIGNED_TECH: "TECHNICIAN",
    ASSIGNED_PARTS: "PARTS",
    ANY_QC: "QC",
    CLAIMED_QC: "QC",
    CUSTOMER: "CUSTOMER",
  };
  return map[party];
}

/**
 * The ONLY function that changes `Booking.status`.
 * 1. state machine + role guard (`authorize`)
 * 2. compare-and-set update (`WHERE status = <current>`), so two people acting at once
 *    can't both succeed — e.g. two QC inspectors picking the same job
 * 3. audit event (who, when, from, to, note)
 */
export async function transition(
  tx: Tx,
  input: {
    shopId: string;
    bookingId: string;
    action: Action;
    actor: Actor;
    note?: string | null;
    patch?: Omit<Prisma.BookingUncheckedUpdateManyInput, "status" | "id" | "shopId">;
    booking?: LockedBooking;
  },
): Promise<{ from: BookingStatus; to: BookingStatus; booking: LockedBooking }> {
  const b = input.booking ?? (await loadBooking(tx, input.shopId, input.bookingId));
  const res = authorize(input.action, b, input.actor);
  if (!res.ok) throw new AppError(res.code, res.message);

  const updated = await tx.booking.updateMany({
    where: { id: b.id, shopId: b.shopId, status: b.status },
    data: { status: res.to, ...input.patch },
  });
  if (updated.count !== 1) {
    throw conflict("Someone else just updated this booking. Refresh to see the latest.");
  }

  await tx.bookingEvent.create({
    data: {
      bookingId: b.id,
      fromStatus: b.status,
      toStatus: res.to,
      actorId: input.actor.userId,
      actorRole: actingRole(input.action, b, input.actor),
      note: input.note?.trim() || null,
    },
  });

  return { from: b.status, to: res.to, booking: { ...b, status: res.to } };
}
