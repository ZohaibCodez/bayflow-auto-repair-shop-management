import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@prisma/client";
import {
  authorize,
  availableActions,
  CANCELLABLE,
  TRANSITIONS,
  type Actor,
  type BookingRef,
} from "./state-machine";

const booking = (status: BookingStatus, over: Partial<BookingRef> = {}): BookingRef => ({
  status,
  customerId: "cust",
  assignedTechId: "tech",
  partsPersonId: "parts",
  qcInspectorId: null,
  ...over,
});

const sa: Actor = { userId: "sa", isOwner: false, roles: ["SERVICE_ADVISOR"] };
const owner: Actor = { userId: "owner", isOwner: true, roles: [] };
const tech: Actor = { userId: "tech", isOwner: false, roles: ["TECHNICIAN"] };
const otherTech: Actor = { userId: "tech2", isOwner: false, roles: ["TECHNICIAN"] };
const parts: Actor = { userId: "parts", isOwner: false, roles: ["PARTS"] };
const qc: Actor = { userId: "qc", isOwner: false, roles: ["QC"] };
const qc2: Actor = { userId: "qc2", isOwner: false, roles: ["QC"] };
const customer: Actor = { userId: "cust", isOwner: false, roles: [] };
const stranger: Actor = { userId: "nobody", isOwner: false, roles: [] };

describe("happy path (brief §5.2)", () => {
  const steps: [string, BookingStatus, Actor, BookingStatus, Partial<BookingRef>?][] = [
    ["confirm", "PENDING", sa, "CONFIRMED"],
    ["assignTechnician", "CONFIRMED", sa, "ASSIGNED"],
    ["startInspection", "ASSIGNED", tech, "INSPECTING"],
    ["submitEstimate", "INSPECTING", tech, "ESTIMATE_REVIEW"],
    ["sendEstimate", "ESTIMATE_REVIEW", sa, "AWAITING_CUSTOMER"],
    ["approveEstimate", "AWAITING_CUSTOMER", customer, "ESTIMATE_APPROVED"],
    ["assignParts", "ESTIMATE_APPROVED", sa, "PARTS_PENDING"],
    ["orderParts", "PARTS_PENDING", parts, "PARTS_ORDERED"],
    ["markPartsReady", "PARTS_ORDERED", parts, "PARTS_READY"],
    ["allocateParts", "PARTS_READY", parts, "IN_REPAIR"],
    ["sendToQc", "IN_REPAIR", tech, "QC_PENDING"],
    ["claimQc", "QC_PENDING", qc, "QC_IN_PROGRESS"],
    ["passQc", "QC_IN_PROGRESS", qc, "READY_FOR_PICKUP", { qcInspectorId: "qc" }],
    ["complete", "READY_FOR_PICKUP", sa, "COMPLETED"],
  ];
  it.each(steps)("%s: %s → %s", (action, from, actor, to, over) => {
    const res = authorize(action as keyof typeof TRANSITIONS, booking(from, over), actor);
    expect(res).toEqual({ ok: true, to });
  });
});

describe("edge paths (brief §5.3)", () => {
  it("customer can reject; SA can revise or return to the technician", () => {
    expect(authorize("rejectEstimate", booking("AWAITING_CUSTOMER"), customer)).toMatchObject({
      ok: true,
      to: "ESTIMATE_REJECTED",
    });
    expect(authorize("reviseEstimate", booking("ESTIMATE_REJECTED"), sa)).toMatchObject({
      to: "ESTIMATE_REVIEW",
    });
    expect(authorize("returnToTechnician", booking("ESTIMATE_REJECTED"), sa)).toMatchObject({
      to: "INSPECTING",
    });
  });

  it("parts already in stock skip ordering", () => {
    expect(authorize("markPartsReady", booking("PARTS_PENDING"), parts)).toMatchObject({
      ok: true,
      to: "PARTS_READY",
    });
  });

  it("failed QC loops back to IN_REPAIR", () => {
    const b = booking("QC_IN_PROGRESS", { qcInspectorId: "qc" });
    expect(authorize("failQc", b, qc)).toEqual({ ok: true, to: "IN_REPAIR" });
  });

  it("cancellation allowed before IN_REPAIR, by customer or SA only", () => {
    for (const s of CANCELLABLE) {
      expect(authorize("cancel", booking(s), customer).ok).toBe(true);
      expect(authorize("cancel", booking(s), sa).ok).toBe(true);
      expect(authorize("cancel", booking(s), tech).ok).toBe(false);
    }
    for (const s of ["IN_REPAIR", "QC_PENDING", "READY_FOR_PICKUP", "COMPLETED"] as const) {
      expect(authorize("cancel", booking(s), sa)).toMatchObject({ code: "INVALID_TRANSITION" });
    }
  });

  it("customer can mark pick-up to complete", () => {
    expect(authorize("complete", booking("READY_FOR_PICKUP"), customer).ok).toBe(true);
  });
});

describe("role guards — no role can perform another role's action", () => {
  it("a technician cannot approve an estimate", () => {
    expect(authorize("approveEstimate", booking("AWAITING_CUSTOMER"), tech)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("only the ASSIGNED technician can act on the job", () => {
    expect(authorize("startInspection", booking("ASSIGNED"), otherTech)).toMatchObject({
      code: "FORBIDDEN",
    });
    expect(authorize("sendToQc", booking("IN_REPAIR"), otherTech)).toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("only the QC inspector who picked the job can pass or fail it", () => {
    const b = booking("QC_IN_PROGRESS", { qcInspectorId: "qc" });
    expect(authorize("passQc", b, qc2)).toMatchObject({ code: "FORBIDDEN" });
    expect(authorize("failQc", b, qc2)).toMatchObject({ code: "FORBIDDEN" });
  });

  it("another customer cannot touch the booking", () => {
    expect(authorize("approveEstimate", booking("AWAITING_CUSTOMER"), stranger)).toMatchObject({
      code: "FORBIDDEN",
    });
    expect(authorize("cancel", booking("PENDING"), stranger)).toMatchObject({ code: "FORBIDDEN" });
  });

  it("the owner has advisor powers but not technician/customer powers", () => {
    expect(authorize("confirm", booking("PENDING"), owner).ok).toBe(true);
    expect(authorize("submitEstimate", booking("INSPECTING"), owner).ok).toBe(false);
    expect(authorize("approveEstimate", booking("AWAITING_CUSTOMER"), owner).ok).toBe(false);
  });

  it("an advisor cannot do parts or QC work", () => {
    expect(authorize("allocateParts", booking("PARTS_READY"), sa).ok).toBe(false);
    expect(authorize("claimQc", booking("QC_PENDING"), sa).ok).toBe(false);
  });
});

describe("invalid transitions are rejected", () => {
  it("cannot skip steps", () => {
    expect(authorize("sendEstimate", booking("INSPECTING"), sa)).toMatchObject({
      code: "INVALID_TRANSITION",
    });
    expect(authorize("complete", booking("IN_REPAIR"), sa)).toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("terminal states have no actions", () => {
    for (const s of ["COMPLETED", "CANCELLED"] as const) {
      for (const a of [sa, owner, tech, parts, qc, customer]) {
        expect(availableActions(booking(s), a)).toEqual([]);
      }
    }
  });
});

describe("availableActions drives the UI", () => {
  it("SA at PENDING sees confirm / decline / cancel", () => {
    expect(availableActions(booking("PENDING"), sa)).toEqual(["confirm", "decline", "cancel"]);
  });
  it("customer at AWAITING_CUSTOMER sees approve / reject / cancel", () => {
    expect(availableActions(booking("AWAITING_CUSTOMER"), customer)).toEqual([
      "approveEstimate",
      "rejectEstimate",
      "cancel",
    ]);
  });
});
