import type { BookingStatus } from "@prisma/client";

/**
 * Turns "every booking in the shop" into "what is waiting on *me*, oldest first".
 *
 * Pure and free of any server import, so the floor board (a client component) and
 * the dashboard (a server component) can share it. The rules about which
 * transitions are *legal* live in `state-machine.ts`; this module only decides
 * whose screen a job should appear on and what to call the next move.
 */

/** The desk a job is sitting on while it holds a status. */
export type Desk = "SERVICE_ADVISOR" | "TECHNICIAN" | "PARTS" | "QC";

/**
 * Who owes the next move. `CUSTOMER` means the shop is correctly waiting and the
 * job must not be nagged about; `null` means the job is finished or cancelled.
 *
 * Written as an exhaustive Record on purpose: adding a status to the schema fails
 * the build here until someone says whose queue it belongs in.
 */
export const DESK_FOR: Record<BookingStatus, Desk | "CUSTOMER" | null> = {
  PENDING: "SERVICE_ADVISOR",
  CONFIRMED: "SERVICE_ADVISOR",
  ASSIGNED: "TECHNICIAN",
  INSPECTING: "TECHNICIAN",
  ESTIMATE_REVIEW: "SERVICE_ADVISOR",
  AWAITING_CUSTOMER: "CUSTOMER",
  ESTIMATE_APPROVED: "SERVICE_ADVISOR",
  ESTIMATE_REJECTED: "SERVICE_ADVISOR",
  PARTS_PENDING: "PARTS",
  PARTS_ORDERED: "PARTS",
  PARTS_READY: "PARTS",
  IN_REPAIR: "TECHNICIAN",
  QC_PENDING: "QC",
  QC_IN_PROGRESS: "QC",
  READY_FOR_PICKUP: "SERVICE_ADVISOR",
  COMPLETED: null,
  CANCELLED: null,
};

/** The next move, named as the person would say it out loud. */
export const NEXT_ACTION: Record<BookingStatus, string | null> = {
  PENDING: "Confirm the booking",
  CONFIRMED: "Assign a technician",
  ASSIGNED: "Start the inspection",
  INSPECTING: "Finish the estimate",
  ESTIMATE_REVIEW: "Review and send the estimate",
  AWAITING_CUSTOMER: "Waiting on the customer",
  ESTIMATE_APPROVED: "Hand it to parts",
  ESTIMATE_REJECTED: "Revise it or cancel",
  PARTS_PENDING: "Check stock",
  PARTS_ORDERED: "Receive the order",
  PARTS_READY: "Release it to the technician",
  IN_REPAIR: "Finish the repair",
  QC_PENDING: "Claim the quality check",
  QC_IN_PROGRESS: "Finish the quality check",
  READY_FOR_PICKUP: "Notify and hand over",
  COMPLETED: null,
  CANCELLED: null,
};

/** The shape the queue needs — `BookingRow` satisfies it structurally. */
export type QueueBooking = {
  id: string;
  code: string;
  status: BookingStatus;
  updatedAt: Date;
  assignedTechId: string | null;
  partsPersonId: string | null;
  vehicle: { plate: string; make: string; model: string; year: number };
  customer: { name: string };
  slot: { startsAt: Date } | null;
  qcInspector: { id: string; name: string } | null;
  issues: { id: string }[];
};

export type Viewer = {
  userId: string;
  isOwner: boolean;
  roles: readonly string[];
};

export type QueueItem<T extends QueueBooking = QueueBooking> = {
  booking: T;
  action: string;
  /** When it arrived at its current status, so we can show how long it has sat. */
  since: Date;
  stalled: boolean;
};

/** A job waiting on a person for longer than this is flagged on the board. */
export const STALL_HOURS = 24;

/**
 * Is this job sitting on a desk this viewer actually works?
 *
 * The assignment checks mirror the access rules: a technician only ever answers
 * for their own cars, parts only for jobs handed to them, and QC's pending queue
 * is shared until somebody claims it (after which it belongs to the claimer).
 */
function isMine(b: QueueBooking, desk: Desk, viewer: Viewer): boolean {
  switch (desk) {
    case "TECHNICIAN":
      return b.assignedTechId === viewer.userId;
    case "PARTS":
      return b.partsPersonId === null || b.partsPersonId === viewer.userId;
    case "QC":
      return b.status === "QC_PENDING" || b.qcInspector?.id === viewer.userId;
    case "SERVICE_ADVISOR":
      return true;
  }
}

/**
 * What this person should do next, oldest wait first.
 *
 * An owner with no staff role sees every desk — for them the question is "what is
 * the shop waiting on", not "what am I holding up".
 */
export function nextUp<T extends QueueBooking>(
  rows: readonly T[],
  viewer: Viewer,
  now: Date = new Date(),
): QueueItem<T>[] {
  const desks = new Set(viewer.roles.filter((r): r is Desk => r in DESK_ROLES));
  const seesEveryDesk = viewer.isOwner && desks.size === 0;
  const stallBefore = now.getTime() - STALL_HOURS * 3_600_000;

  return rows
    .flatMap((booking) => {
      const desk = DESK_FOR[booking.status];
      if (desk === null || desk === "CUSTOMER") return [];
      if (!seesEveryDesk && !(desks.has(desk) && isMine(booking, desk, viewer))) return [];
      const action = NEXT_ACTION[booking.status];
      if (!action) return [];
      return [
        {
          booking,
          action,
          since: booking.updatedAt,
          stalled: booking.updatedAt.getTime() < stallBefore,
        },
      ];
    })
    .sort((a, b) => a.since.getTime() - b.since.getTime());
}

/** Membership roles that map onto a desk (OWNER is handled separately). */
const DESK_ROLES = {
  SERVICE_ADVISOR: true,
  TECHNICIAN: true,
  PARTS: true,
  QC: true,
} as const;
