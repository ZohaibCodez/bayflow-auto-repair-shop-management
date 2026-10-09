import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@prisma/client";
import { DESK_FOR, NEXT_ACTION, nextUp, STALL_HOURS, type QueueBooking } from "./queue";
import { STATUS_META } from "./status-meta";

const NOW = new Date("2026-10-09T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

let seq = 0;
function booking(over: Partial<QueueBooking> & { status: BookingStatus }): QueueBooking {
  seq += 1;
  return {
    id: `b${seq}`,
    code: `LEA-${seq}`,
    updatedAt: hoursAgo(1),
    assignedTechId: null,
    partsPersonId: null,
    qcInspector: null,
    vehicle: { plate: `PLATE-${seq}`, make: "Honda", model: "Civic", year: 2019 },
    customer: { name: "Ahmed Khan" },
    slot: null,
    issues: [],
    ...over,
  };
}

const ADVISOR = { userId: "u-sa", isOwner: false, roles: ["SERVICE_ADVISOR"] };
const TECH = { userId: "u-tech", isOwner: false, roles: ["TECHNICIAN"] };
const PARTS = { userId: "u-parts", isOwner: false, roles: ["PARTS"] };
const QC = { userId: "u-qc", isOwner: false, roles: ["QC"] };
const OWNER = { userId: "u-owner", isOwner: true, roles: [] as string[] };

describe("desk mapping", () => {
  const statuses = Object.keys(STATUS_META) as BookingStatus[];

  it("assigns every status a desk, the customer, or nobody", () => {
    for (const s of statuses) expect(DESK_FOR[s], s).toBeDefined();
  });

  it("names an action for exactly the statuses that are still moving", () => {
    for (const s of statuses) {
      const finished = s === "COMPLETED" || s === "CANCELLED";
      expect(Boolean(NEXT_ACTION[s]), s).toBe(!finished);
    }
  });

  it("never asks staff to act on a job that is with the customer", () => {
    expect(DESK_FOR.AWAITING_CUSTOMER).toBe("CUSTOMER");
    expect(nextUp([booking({ status: "AWAITING_CUSTOMER" })], ADVISOR, NOW)).toHaveLength(0);
  });

  it("drops finished and cancelled jobs", () => {
    const rows = [booking({ status: "COMPLETED" }), booking({ status: "CANCELLED" })];
    expect(nextUp(rows, OWNER, NOW)).toHaveLength(0);
  });
});

describe("whose queue a job lands in", () => {
  it("gives the advisor front-desk work and not the technician's", () => {
    const rows = [booking({ status: "PENDING" }), booking({ status: "IN_REPAIR" })];
    const actions = nextUp(rows, ADVISOR, NOW).map((i) => i.booking.status);
    expect(actions).toEqual(["PENDING"]);
  });

  it("shows a technician only their own cars", () => {
    const mine = booking({ status: "ASSIGNED", assignedTechId: "u-tech" });
    const theirs = booking({ status: "ASSIGNED", assignedTechId: "someone-else" });
    const queue = nextUp([mine, theirs], TECH, NOW);
    expect(queue.map((i) => i.booking.id)).toEqual([mine.id]);
  });

  it("gives parts unclaimed work and their own, but not a colleague's", () => {
    const unclaimed = booking({ status: "PARTS_PENDING", partsPersonId: null });
    const mine = booking({ status: "PARTS_ORDERED", partsPersonId: "u-parts" });
    const theirs = booking({ status: "PARTS_READY", partsPersonId: "other" });
    const ids = nextUp([unclaimed, mine, theirs], PARTS, NOW).map((i) => i.booking.id);
    expect(ids.sort()).toEqual([mine.id, unclaimed.id].sort());
  });

  it("keeps the QC queue shared until somebody claims it", () => {
    const open = booking({ status: "QC_PENDING" });
    const mine = booking({
      status: "QC_IN_PROGRESS",
      qcInspector: { id: "u-qc", name: "Sara" },
    });
    const theirs = booking({
      status: "QC_IN_PROGRESS",
      qcInspector: { id: "other", name: "Bilal" },
    });
    const ids = nextUp([open, mine, theirs], QC, NOW).map((i) => i.booking.id);
    expect(ids.sort()).toEqual([mine.id, open.id].sort());
  });

  it("shows an owner with no staff role every desk in the shop", () => {
    const rows = [
      booking({ status: "PENDING" }),
      booking({ status: "IN_REPAIR", assignedTechId: "someone-else" }),
      booking({ status: "PARTS_PENDING" }),
      booking({ status: "QC_PENDING" }),
    ];
    expect(nextUp(rows, OWNER, NOW)).toHaveLength(4);
  });

  it("an owner who also works a desk is held to that desk's rules", () => {
    const owner = { userId: "u-owner", isOwner: true, roles: ["TECHNICIAN"] };
    const mine = booking({ status: "IN_REPAIR", assignedTechId: "u-owner" });
    const theirs = booking({ status: "IN_REPAIR", assignedTechId: "other" });
    const frontDesk = booking({ status: "PENDING" });
    const ids = nextUp([mine, theirs, frontDesk], owner, NOW).map((i) => i.booking.id);
    expect(ids).toEqual([mine.id]);
  });
});

describe("ordering and stalling", () => {
  it("puts the longest wait first", () => {
    const recent = booking({ status: "PENDING", updatedAt: hoursAgo(1) });
    const oldest = booking({ status: "CONFIRMED", updatedAt: hoursAgo(30) });
    const middle = booking({ status: "ESTIMATE_REVIEW", updatedAt: hoursAgo(5) });
    const ids = nextUp([recent, oldest, middle], ADVISOR, NOW).map((i) => i.booking.id);
    expect(ids).toEqual([oldest.id, middle.id, recent.id]);
  });

  it("flags a job that has sat on a desk past the stall threshold", () => {
    const stale = booking({ status: "PENDING", updatedAt: hoursAgo(STALL_HOURS + 1) });
    const fresh = booking({ status: "PENDING", updatedAt: hoursAgo(STALL_HOURS - 1) });
    const queue = nextUp([stale, fresh], ADVISOR, NOW);
    expect(queue.find((i) => i.booking.id === stale.id)?.stalled).toBe(true);
    expect(queue.find((i) => i.booking.id === fresh.id)?.stalled).toBe(false);
  });

  it("carries the action verb through to the caller", () => {
    const [item] = nextUp([booking({ status: "QC_PENDING" })], QC, NOW);
    expect(item.action).toBe(NEXT_ACTION.QC_PENDING);
  });
});
