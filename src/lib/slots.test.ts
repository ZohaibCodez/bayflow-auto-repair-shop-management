import { describe, expect, it } from "vitest";
import { DEFAULT_WORKING_HOURS, isValidSlotStart, slotStartsFor } from "./slots";
import { formatTime, shopDateKey, shopTime } from "./time";

describe("slot generation (shop time, Asia/Karachi)", () => {
  // 2026-10-09 is a Friday, 2026-10-10 a Saturday, 2026-10-11 a Sunday.
  it("weekday 09:00–18:00 with 60-min slots → 9 slots, first at 09:00 PKT", () => {
    const slots = slotStartsFor(DEFAULT_WORKING_HOURS, "2026-10-09", 60);
    expect(slots).toHaveLength(9);
    expect(formatTime(slots[0])).toBe("09:00");
    expect(formatTime(slots[8])).toBe("17:00");
    // 09:00 PKT is 04:00 UTC — the stored instant must not depend on the server zone.
    expect(slots[0].toISOString()).toBe("2026-10-09T04:00:00.000Z");
  });

  it("uses Saturday hours and is closed on Sunday", () => {
    expect(slotStartsFor(DEFAULT_WORKING_HOURS, "2026-10-10", 60)).toHaveLength(6);
    expect(slotStartsFor(DEFAULT_WORKING_HOURS, "2026-10-11", 60)).toEqual([]);
  });

  it("does not create a slot that would run past closing", () => {
    const slots = slotStartsFor({ fri: { open: "09:00", close: "10:30" } }, "2026-10-09", 45);
    expect(slots.map(formatTime)).toEqual(["09:00", "09:45"]);
  });

  it("rejects forged slot times", () => {
    const real = shopTime("2026-10-09", "10:00");
    const forged = shopTime("2026-10-09", "10:17");
    expect(isValidSlotStart(DEFAULT_WORKING_HOURS, "2026-10-09", 60, real)).toBe(true);
    expect(isValidSlotStart(DEFAULT_WORKING_HOURS, "2026-10-09", 60, forged)).toBe(false);
  });

  it("shopDateKey rolls over at PKT midnight, not UTC midnight", () => {
    // 2026-10-09 20:30 UTC is already 01:30 on the 10th in Pakistan.
    expect(shopDateKey(new Date("2026-10-09T20:30:00Z"))).toBe("2026-10-10");
  });
});
