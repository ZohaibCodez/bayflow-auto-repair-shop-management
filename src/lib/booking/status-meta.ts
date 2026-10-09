import type { BookingStatus } from "@prisma/client";
import { STATUS_LABEL } from "./state-machine";

/**
 * Presentation metadata for each status: tone, pipeline phase, who acts next, and
 * customer-facing copy. Pure display — the rules live in state-machine.ts.
 */

export type Tone = "amber" | "blue" | "violet" | "cyan" | "teal" | "red" | "steel";

export const PHASES = [
  "Booked",
  "Confirmed",
  "Inspection",
  "Approval",
  "Parts",
  "Repair & QC",
  "Ready",
] as const;

type Meta = { tone: Tone; phase: number; waitingOn: string; customer: string };

export const STATUS_META: Record<BookingStatus, Meta> = {
  PENDING: {
    tone: "amber",
    phase: 0,
    waitingOn: "Service advisor",
    customer: "We've got your booking. The shop will confirm it shortly.",
  },
  CONFIRMED: {
    tone: "blue",
    phase: 1,
    waitingOn: "Service advisor",
    customer: "Confirmed! A technician is being assigned to your car.",
  },
  ASSIGNED: {
    tone: "blue",
    phase: 1,
    waitingOn: "Technician",
    customer: "A technician has been assigned and will inspect your car at your appointment.",
  },
  INSPECTING: {
    tone: "violet",
    phase: 2,
    waitingOn: "Technician",
    customer: "Your car is being inspected. An itemised estimate is on its way.",
  },
  ESTIMATE_REVIEW: {
    tone: "violet",
    phase: 2,
    waitingOn: "Service advisor",
    customer: "The advisor is reviewing the estimate before sending it to you.",
  },
  AWAITING_CUSTOMER: {
    tone: "amber",
    phase: 3,
    waitingOn: "Customer",
    customer: "Your estimate is ready. Review it and approve or decline — no work starts without you.",
  },
  ESTIMATE_APPROVED: {
    tone: "blue",
    phase: 3,
    waitingOn: "Service advisor",
    customer: "Thanks for approving. The shop is getting the parts ready.",
  },
  ESTIMATE_REJECTED: {
    tone: "red",
    phase: 3,
    waitingOn: "Service advisor",
    customer: "You declined the estimate. The advisor will revise it or get in touch.",
  },
  PARTS_PENDING: {
    tone: "cyan",
    phase: 4,
    waitingOn: "Parts",
    customer: "Checking parts availability for your repair.",
  },
  PARTS_ORDERED: {
    tone: "cyan",
    phase: 4,
    waitingOn: "Parts",
    customer: "Some parts were ordered. We'll start as soon as they arrive.",
  },
  PARTS_READY: {
    tone: "cyan",
    phase: 4,
    waitingOn: "Parts",
    customer: "All parts are in. Your repair is about to start.",
  },
  IN_REPAIR: {
    tone: "violet",
    phase: 5,
    waitingOn: "Technician",
    customer: "Your car is being repaired.",
  },
  QC_PENDING: {
    tone: "violet",
    phase: 5,
    waitingOn: "QC inspector",
    customer: "Repair done. Waiting for an independent quality check.",
  },
  QC_IN_PROGRESS: {
    tone: "violet",
    phase: 5,
    waitingOn: "QC inspector",
    customer: "A quality inspector is testing your car right now.",
  },
  READY_FOR_PICKUP: {
    tone: "teal",
    phase: 6,
    waitingOn: "Customer",
    customer: "Your car passed quality check and is ready for pick-up.",
  },
  COMPLETED: {
    tone: "teal",
    phase: 7,
    waitingOn: "—",
    customer: "Collected. Thanks for choosing us — drive safe!",
  },
  CANCELLED: {
    tone: "steel",
    phase: -1,
    waitingOn: "—",
    customer: "This booking was cancelled.",
  },
};

export const statusLabel = (s: BookingStatus) => STATUS_LABEL[s];

/** Tailwind classes per tone — text, soft background, border, solid dot. */
export const TONE_CLASS: Record<Tone, { text: string; soft: string; border: string; dot: string }> = {
  amber: { text: "text-amber", soft: "bg-amber/10", border: "border-amber/30", dot: "bg-amber" },
  blue: {
    text: "text-signal-blue",
    soft: "bg-signal-blue/10",
    border: "border-signal-blue/30",
    dot: "bg-signal-blue",
  },
  violet: {
    text: "text-signal-violet",
    soft: "bg-signal-violet/10",
    border: "border-signal-violet/30",
    dot: "bg-signal-violet",
  },
  cyan: {
    text: "text-signal-cyan",
    soft: "bg-signal-cyan/10",
    border: "border-signal-cyan/30",
    dot: "bg-signal-cyan",
  },
  teal: { text: "text-teal", soft: "bg-teal/10", border: "border-teal/30", dot: "bg-teal" },
  red: {
    text: "text-signal-red",
    soft: "bg-signal-red/10",
    border: "border-signal-red/30",
    dot: "bg-signal-red",
  },
  steel: { text: "text-steel", soft: "bg-steel/10", border: "border-steel/25", dot: "bg-steel" },
};

export const ACTIVE_STATUSES: BookingStatus[] = (Object.keys(STATUS_META) as BookingStatus[]).filter(
  (s) => s !== "COMPLETED" && s !== "CANCELLED",
);
