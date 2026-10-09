import type { BookingStatus, StaffRole } from "@prisma/client";

/**
 * THE booking state machine — the single source of truth for which action moves a booking
 * from which status to which, and who may perform it. Pure (no DB), so it is unit-tested
 * directly. `lib/booking/transition.ts` is the only code that writes `Booking.status`, and it
 * always asks `authorize()` first.
 */

export type Action =
  | "confirm"
  | "decline"
  | "assignTechnician"
  | "startInspection"
  | "submitEstimate"
  | "sendEstimate"
  | "approveEstimate"
  | "rejectEstimate"
  | "reviseEstimate"
  | "returnToTechnician"
  | "assignParts"
  | "orderParts"
  | "markPartsReady"
  | "allocateParts"
  | "sendToQc"
  | "claimQc"
  | "passQc"
  | "failQc"
  | "notifyReady"
  | "complete"
  | "cancel";

/**
 * Who may act. Relative to one booking:
 * - ADVISOR: a Service Advisor of the booking's shop, or the shop Owner (support access).
 * - ASSIGNED_TECH / ASSIGNED_PARTS: the staff member the SA assigned to *this* booking.
 * - ANY_QC: any QC inspector of the shop. CLAIMED_QC: the inspector who picked the job.
 * - CUSTOMER: the customer who owns the booking.
 */
export type Party =
  | "ADVISOR"
  | "ASSIGNED_TECH"
  | "ASSIGNED_PARTS"
  | "ANY_QC"
  | "CLAIMED_QC"
  | "CUSTOMER";

type Rule = { from: readonly BookingStatus[]; to: BookingStatus; by: readonly Party[] };

/** Cancellation is allowed by the customer or SA at any point before the repair starts. */
export const CANCELLABLE: readonly BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ASSIGNED",
  "INSPECTING",
  "ESTIMATE_REVIEW",
  "AWAITING_CUSTOMER",
  "ESTIMATE_APPROVED",
  "ESTIMATE_REJECTED",
  "PARTS_PENDING",
  "PARTS_ORDERED",
  "PARTS_READY",
];

export const TRANSITIONS: Record<Action, Rule> = {
  confirm: { from: ["PENDING"], to: "CONFIRMED", by: ["ADVISOR"] },
  decline: { from: ["PENDING"], to: "CANCELLED", by: ["ADVISOR"] },
  assignTechnician: { from: ["CONFIRMED"], to: "ASSIGNED", by: ["ADVISOR"] },
  startInspection: { from: ["ASSIGNED"], to: "INSPECTING", by: ["ASSIGNED_TECH"] },
  submitEstimate: { from: ["INSPECTING"], to: "ESTIMATE_REVIEW", by: ["ASSIGNED_TECH"] },
  sendEstimate: { from: ["ESTIMATE_REVIEW"], to: "AWAITING_CUSTOMER", by: ["ADVISOR"] },
  approveEstimate: { from: ["AWAITING_CUSTOMER"], to: "ESTIMATE_APPROVED", by: ["CUSTOMER"] },
  rejectEstimate: { from: ["AWAITING_CUSTOMER"], to: "ESTIMATE_REJECTED", by: ["CUSTOMER"] },
  // After a rejection the SA either revises the estimate themselves…
  reviseEstimate: { from: ["ESTIMATE_REJECTED"], to: "ESTIMATE_REVIEW", by: ["ADVISOR"] },
  // …or sends it back to the technician to re-inspect / re-quote.
  returnToTechnician: {
    from: ["ESTIMATE_REVIEW", "ESTIMATE_REJECTED"],
    to: "INSPECTING",
    by: ["ADVISOR"],
  },
  assignParts: { from: ["ESTIMATE_APPROVED"], to: "PARTS_PENDING", by: ["ADVISOR"] },
  orderParts: { from: ["PARTS_PENDING"], to: "PARTS_ORDERED", by: ["ASSIGNED_PARTS"] },
  // From PARTS_PENDING when everything is already in stock; from PARTS_ORDERED once received.
  markPartsReady: {
    from: ["PARTS_PENDING", "PARTS_ORDERED"],
    to: "PARTS_READY",
    by: ["ASSIGNED_PARTS"],
  },
  allocateParts: { from: ["PARTS_READY"], to: "IN_REPAIR", by: ["ASSIGNED_PARTS"] },
  sendToQc: { from: ["IN_REPAIR"], to: "QC_PENDING", by: ["ASSIGNED_TECH"] },
  claimQc: { from: ["QC_PENDING"], to: "QC_IN_PROGRESS", by: ["ANY_QC"] },
  passQc: { from: ["QC_IN_PROGRESS"], to: "READY_FOR_PICKUP", by: ["CLAIMED_QC"] },
  failQc: { from: ["QC_IN_PROGRESS"], to: "IN_REPAIR", by: ["CLAIMED_QC"] },
  // Not a status change — recorded in the audit log so the customer notice is accountable.
  notifyReady: { from: ["READY_FOR_PICKUP"], to: "READY_FOR_PICKUP", by: ["ADVISOR"] },
  complete: { from: ["READY_FOR_PICKUP"], to: "COMPLETED", by: ["ADVISOR", "CUSTOMER"] },
  cancel: { from: CANCELLABLE, to: "CANCELLED", by: ["ADVISOR", "CUSTOMER"] },
};

/** The actor, as seen from the booking's shop. `roles` are their memberships in that shop. */
export type Actor = { userId: string; isOwner: boolean; roles: readonly StaffRole[] };

export type BookingRef = {
  status: BookingStatus;
  customerId: string;
  assignedTechId: string | null;
  partsPersonId: string | null;
  qcInspectorId: string | null;
};

export function actsAs(party: Party, actor: Actor, b: BookingRef): boolean {
  const has = (r: StaffRole) => actor.roles.includes(r);
  switch (party) {
    case "ADVISOR":
      return actor.isOwner || has("SERVICE_ADVISOR");
    case "ASSIGNED_TECH":
      return has("TECHNICIAN") && b.assignedTechId === actor.userId;
    case "ASSIGNED_PARTS":
      return has("PARTS") && b.partsPersonId === actor.userId;
    case "ANY_QC":
      return has("QC");
    case "CLAIMED_QC":
      return has("QC") && b.qcInspectorId === actor.userId;
    case "CUSTOMER":
      return b.customerId === actor.userId;
  }
}

export type AuthResult =
  | { ok: true; to: BookingStatus }
  | { ok: false; code: "INVALID_TRANSITION" | "FORBIDDEN"; message: string };

/** Can `actor` perform `action` on booking `b` right now? Checks the transition, then the role. */
export function authorize(action: Action, b: BookingRef, actor: Actor): AuthResult {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(b.status)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Can't ${ACTION_LABEL[action].toLowerCase()} while the booking is ${STATUS_LABEL[b.status].toLowerCase()}.`,
    };
  }
  if (!rule.by.some((p) => actsAs(p, actor, b))) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: `Your role can't ${ACTION_LABEL[action].toLowerCase()} on this booking.`,
    };
  }
  return { ok: true, to: rule.to };
}

/** Every action `actor` may take on `b` right now — drives the role-aware action panel. */
export function availableActions(b: BookingRef, actor: Actor): Action[] {
  return (Object.keys(TRANSITIONS) as Action[]).filter((a) => authorize(a, b, actor).ok);
}

export const ACTION_LABEL: Record<Action, string> = {
  confirm: "Confirm booking",
  decline: "Decline booking",
  assignTechnician: "Assign technician",
  startInspection: "Start inspection",
  submitEstimate: "Submit estimate",
  sendEstimate: "Send estimate",
  approveEstimate: "Approve estimate",
  rejectEstimate: "Reject estimate",
  reviseEstimate: "Revise estimate",
  returnToTechnician: "Return to technician",
  assignParts: "Assign parts person",
  orderParts: "Order parts",
  markPartsReady: "Mark parts ready",
  allocateParts: "Allocate parts",
  sendToQc: "Send to QC",
  claimQc: "Pick QC job",
  passQc: "Pass QC",
  failQc: "Fail QC",
  notifyReady: "Notify customer",
  complete: "Complete booking",
  cancel: "Cancel booking",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  INSPECTING: "Inspecting",
  ESTIMATE_REVIEW: "Estimate review",
  AWAITING_CUSTOMER: "Awaiting customer",
  ESTIMATE_APPROVED: "Estimate approved",
  ESTIMATE_REJECTED: "Estimate rejected",
  PARTS_PENDING: "Parts pending",
  PARTS_ORDERED: "Parts ordered",
  PARTS_READY: "Parts ready",
  IN_REPAIR: "In repair",
  QC_PENDING: "QC pending",
  QC_IN_PROGRESS: "QC in progress",
  READY_FOR_PICKUP: "Ready for pick-up",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
