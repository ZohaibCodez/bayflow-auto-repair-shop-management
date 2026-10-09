"use server";

import { refresh } from "next/cache";
import type { Actor } from "@/lib/booking/state-machine";
import { requireBookingAccess } from "@/lib/rbac";
import * as wf from "@/server/services/workflow";
import * as parts from "@/server/services/parts";
import { run, type ActionResult } from "./result";

/**
 * Booking workflow actions. The client only sends a bookingId; the shop and the actor's
 * roles are derived server-side from the booking (requireBookingAccess hides bookings the
 * user can't see), and the service re-checks the transition + role guard.
 */

type Ref = { shopId: string; bookingId: string };

async function withBooking<T>(
  bookingId: string,
  fn: (actor: Actor, ref: Ref) => Promise<T>,
  message: string,
): Promise<ActionResult> {
  const res = await run(async () => {
    const { actor, booking } = await requireBookingAccess(bookingId);
    await fn(actor, { shopId: booking.shopId, bookingId: booking.id });
  }, message);
  if (res.ok) refresh();
  return res as ActionResult;
}

export async function confirmBookingAction(bookingId: string, technicianId?: string) {
  return withBooking(
    bookingId,
    (a, r) => wf.confirmBooking(a, { ...r, technicianId: technicianId || undefined }),
    technicianId ? "Booking confirmed and technician assigned" : "Booking confirmed",
  );
}

export async function declineBookingAction(bookingId: string, reason?: string) {
  return withBooking(bookingId, (a, r) => wf.declineBooking(a, { ...r, reason }), "Booking declined");
}

export async function assignTechnicianAction(bookingId: string, technicianId: string) {
  return withBooking(bookingId, (a, r) => wf.assignTechnician(a, { ...r, technicianId }), "Technician assigned");
}

export async function startInspectionAction(bookingId: string) {
  return withBooking(bookingId, (a, r) => wf.startInspection(a, r), "Inspection started");
}

export async function saveEstimateAction(bookingId: string, items: wf.EstimateItemInput[]) {
  return withBooking(bookingId, (a, r) => wf.saveEstimateDraft(a, { ...r, items }), "Draft saved");
}

export async function submitEstimateAction(bookingId: string, items: wf.EstimateItemInput[], note?: string) {
  return withBooking(
    bookingId,
    (a, r) => wf.submitEstimate(a, { ...r, items, note }),
    "Estimate submitted to the advisor",
  );
}

export async function sendEstimateAction(bookingId: string, items?: wf.EstimateItemInput[], note?: string) {
  return withBooking(bookingId, (a, r) => wf.sendEstimate(a, { ...r, items, note }), "Estimate sent to the customer");
}

export async function respondToEstimateAction(bookingId: string, decision: "approve" | "reject", note?: string) {
  return withBooking(
    bookingId,
    (a, r) => wf.respondToEstimate(a, { ...r, decision, note }),
    decision === "approve" ? "Estimate approved — thank you!" : "Estimate declined. The shop has been told.",
  );
}

export async function reviseEstimateAction(bookingId: string, note?: string) {
  return withBooking(bookingId, (a, r) => wf.reviseEstimate(a, { ...r, note }), "New estimate version opened");
}

export async function returnToTechnicianAction(bookingId: string, note?: string) {
  return withBooking(
    bookingId,
    (a, r) => wf.returnToTechnician(a, { ...r, note }),
    "Sent back to the technician",
  );
}

export async function assignPartsAction(bookingId: string, partsPersonId: string) {
  return withBooking(
    bookingId,
    (a, r) => wf.assignPartsPerson(a, { ...r, partsPersonId }),
    "Parts person assigned",
  );
}

export async function processPartsAction(bookingId: string, supplier?: string) {
  return withBooking(
    bookingId,
    (a, r) => parts.processPartsRequest(a, { ...r, supplier }),
    "Stock checked — parts reserved",
  );
}

export async function markPartsReadyAction(bookingId: string) {
  return withBooking(bookingId, (a, r) => parts.markPartsReady(a, r), "Parts ready");
}

export async function allocatePartsAction(bookingId: string) {
  return withBooking(bookingId, (a, r) => parts.allocateParts(a, r), "Parts allocated — job is back with the technician");
}

export async function sendToQcAction(bookingId: string, note?: string) {
  return withBooking(bookingId, (a, r) => wf.sendToQc(a, { ...r, note }), "Sent to the QC queue");
}

export async function claimQcAction(bookingId: string) {
  return withBooking(bookingId, (a, r) => wf.claimQc(a, r), "Job picked — it's yours");
}

export async function passQcAction(bookingId: string, note?: string) {
  return withBooking(bookingId, (a, r) => wf.passQc(a, { ...r, note }), "QC passed — ready for pick-up");
}

export async function failQcAction(bookingId: string, title: string, description?: string) {
  return withBooking(
    bookingId,
    (a, r) => wf.failQc(a, { ...r, title, description }),
    "Issue logged — job returned to the technician",
  );
}

export async function notifyReadyAction(bookingId: string, message?: string) {
  return withBooking(bookingId, (a, r) => wf.notifyReady(a, { ...r, message }), "Customer notified");
}

export async function completeBookingAction(bookingId: string) {
  return withBooking(bookingId, (a, r) => wf.completeBooking(a, r), "Booking completed");
}

export async function cancelBookingAction(bookingId: string, reason?: string) {
  return withBooking(bookingId, (a, r) => wf.cancelBooking(a, { ...r, reason }), "Booking cancelled");
}
