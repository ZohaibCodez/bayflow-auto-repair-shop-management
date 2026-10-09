/**
 * Shop-local time. Every shop is in Pakistan (Asia/Karachi, UTC+05:00, no DST), so
 * slot math uses a fixed offset and display always formats in the shop zone — never
 * the server's zone (Vercel runs in UTC).
 */
export const SHOP_TZ = "Asia/Karachi";
const OFFSET = "+05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** "YYYY-MM-DD" of the given instant, in shop time. */
export function shopDateKey(date: Date = new Date()): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant at which `HH:mm` occurs on `dateKey` in shop time. */
export function shopTime(dateKey: string, hhmm: string): Date {
  return new Date(`${dateKey}T${hhmm}:00${OFFSET}`);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayKeyOf(dateKey: string): DayKey {
  return DAY_KEYS[new Date(`${dateKey}T12:00:00Z`).getUTCDay()];
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: SHOP_TZ, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

/** 10:00 */
export const formatTime = (d: Date) =>
  fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
/** Fri 10 Oct */
export const formatDay = (d: Date) =>
  fmt({ weekday: "short", day: "numeric", month: "short" }).format(d);
/** Fri 10 Oct, 10:00 */
export const formatDateTime = (d: Date) => `${formatDay(d)}, ${formatTime(d)}`;
/** Friday 10 October */
export const formatLongDay = (d: Date) =>
  fmt({ weekday: "long", day: "numeric", month: "long" }).format(d);

/** "3m ago", "2h ago", "Fri 10 Oct" — for activity feeds. */
export function formatRelative(d: Date, now: Date = new Date()): string {
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDay(d);
}
