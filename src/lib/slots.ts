import { addDaysToKey, dayKeyOf, SHOP_TZ, shopDateKey, shopTime, type DayKey } from "@/lib/time";

/**
 * Slots are generated from each shop's working hours instead of being pre-seeded, so a
 * shop always has bookable times no matter when the seed ran. A `Slot` row is created
 * lazily on the first booking of a time and carries the capacity counter.
 */
export type DayHours = { open: string; close: string } | null;
export type WorkingHours = Partial<Record<DayKey, DayHours>>;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** All slot start instants for a shop-local date. Empty when the shop is closed that day. */
export function slotStartsFor(
  hours: WorkingHours,
  dateKey: string,
  durationMin: number,
): Date[] {
  const day = hours[dayKeyOf(dateKey)];
  if (!day || durationMin <= 0) return [];
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const starts: Date[] = [];
  for (let t = open; t + durationMin <= close; t += durationMin) {
    starts.push(shopTime(dateKey, toHHMM(t)));
  }
  return starts;
}

/** True when `startsAt` is one of the shop's generated slot times (guards forged times). */
export function isValidSlotStart(
  hours: WorkingHours,
  dateKey: string,
  durationMin: number,
  startsAt: Date,
): boolean {
  return slotStartsFor(hours, dateKey, durationMin).some(
    (s) => s.getTime() === startsAt.getTime(),
  );
}

export type BookableDay = { key: string; weekday: string; day: string; month: string; open: boolean };

/**
 * The next `count` shop-local days for the booking wizard's date strip. A day is "open"
 * if a slot still starts at least `leadMinutes` from now — so today after closing isn't
 * offered and the wizard opens on the first bookable day.
 */
export function bookableDays(
  hours: WorkingHours,
  durationMin: number,
  count = 14,
  now: Date = new Date(),
  leadMinutes = 30,
): BookableDay[] {
  const cutoff = now.getTime() + leadMinutes * 60_000;
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: SHOP_TZ, ...opts });
  const today = shopDateKey(now);
  return Array.from({ length: count }, (_, i) => {
    const key = addDaysToKey(today, i);
    const noon = shopTime(key, "12:00");
    return {
      key,
      weekday: fmt({ weekday: "short" }).format(noon),
      day: fmt({ day: "numeric" }).format(noon),
      month: fmt({ month: "short" }).format(noon),
      open: slotStartsFor(hours, key, durationMin).some((s) => s.getTime() > cutoff),
    };
  });
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: { open: "10:00", close: "16:00" },
  sun: null,
};
