// Display-facing view of the booking lifecycle. The authoritative state machine
// (all 15 statuses + guards) lands in stateMachine.ts during Phase 3; these are the
// condensed, customer-legible stages used by the marketing instrument + lifecycle.

/**
 * `owner` is who holds the job at that stage and `where` is the place in the shop
 * it physically sits — the two things a customer actually wants to know. The hero's
 * job card reads both straight off this list.
 */
export const BOOKING_STAGES = [
  { key: "PENDING", label: "Booked", owner: "Customer", where: "online" },
  { key: "CONFIRMED", label: "Confirmed", owner: "Service advisor", where: "front desk" },
  { key: "ASSIGNED", label: "Assigned", owner: "Service advisor", where: "bay 3" },
  { key: "INSPECTING", label: "Inspecting", owner: "Tariq M.", where: "bay 3" },
  { key: "ESTIMATE", label: "Estimate sent", owner: "Service advisor", where: "front desk" },
  { key: "APPROVED", label: "Approved", owner: "Customer", where: "on their phone" },
  { key: "PARTS", label: "Parts allocated", owner: "Hamza R.", where: "store room" },
  { key: "IN_REPAIR", label: "In repair", owner: "Tariq M.", where: "bay 3" },
  { key: "QC", label: "Quality check", owner: "Sana K.", where: "test lane" },
  { key: "READY", label: "Ready for pick-up", owner: "Service advisor", where: "front desk" },
] as const;

export type BookingStageKey = (typeof BOOKING_STAGES)[number]["key"];

export const LIFECYCLE = [
  {
    label: "Booked",
    owner: "Customer",
    blurb: "Pick a shop, describe the problem in plain words, choose a time slot.",
  },
  {
    label: "Confirmed & assigned",
    owner: "Service advisor",
    blurb: "The front desk confirms the job and hands it to a technician.",
  },
  {
    label: "Inspected",
    owner: "Technician",
    blurb: "The vehicle is diagnosed; every part and hour of labour is itemised.",
  },
  {
    label: "Estimate approved",
    owner: "You",
    blurb: "See the itemised cost and approve — or decline — before any work starts.",
  },
  {
    label: "Parts & repair",
    owner: "Parts · Technician",
    blurb: "Stock is checked and allocated, missing parts ordered, then the work is done.",
  },
  {
    label: "Quality checked",
    owner: "QC inspector",
    blurb: "A second person road-tests and signs off — or sends it back to the bay.",
  },
  {
    label: "Ready for pick-up",
    owner: "Service advisor",
    blurb: "You're notified the moment the car is ready. No more calling to ask.",
  },
] as const;
