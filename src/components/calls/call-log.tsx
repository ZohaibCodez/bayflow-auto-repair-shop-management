import Link from "next/link";
import { Bot, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, PhoneCall } from "lucide-react";
import { formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { CallOutcome, CallRow } from "@/server/queries/calls";

const OUTCOME: Record<CallOutcome, { label: string; tone: string }> = {
  ringing: { label: "Ringing", tone: "border-amber/40 bg-amber/10 text-amber-ink" },
  connected: { label: "On the line", tone: "border-teal/40 bg-teal/10 text-teal-ink" },
  answered: { label: "Answered", tone: "border-teal/40 bg-teal/10 text-teal-ink" },
  ended: { label: "Ended", tone: "border-line bg-surface-2 text-muted-foreground" },
  missed: { label: "Missed", tone: "border-signal-red/40 bg-signal-red/10 text-signal-red" },
  declined: { label: "Declined", tone: "border-signal-red/40 bg-signal-red/10 text-signal-red" },
  ai_handled: { label: "AI Front Desk", tone: "border-signal-violet/40 bg-signal-violet/10 text-signal-violet" },
};

export const formatDuration = (sec: number | null) =>
  sec == null ? null : sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;

function CallIcon({ call }: { call: CallRow }) {
  const Icon =
    call.outcome === "ai_handled"
      ? Bot
      : call.outcome === "missed" || call.outcome === "declined"
        ? PhoneMissed
        : call.outcome === "connected" || call.outcome === "ringing"
          ? PhoneCall
          : call.direction === "CUSTOMER_TO_SA"
            ? PhoneIncoming
            : call.outcome === "ended"
              ? PhoneOff
              : PhoneOutgoing;
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-steel">
      <Icon className="size-4" />
    </span>
  );
}

/** Who called whom, what happened and for how long — one row per call. */
export function CallLogList({
  calls,
  bookingHref,
  className,
}: {
  calls: CallRow[];
  /** link each row to its booking (omit on a booking's own page) */
  bookingHref?: (bookingId: string) => string;
  className?: string;
}) {
  return (
    <ul className={cn("panel divide-y divide-line/70 overflow-hidden", className)} data-testid="call-log">
      {calls.map((c) => {
        const outcome = OUTCOME[c.outcome];
        const duration = formatDuration(c.durationSec);
        return (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <CallIcon call={c} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {c.from} <span className="text-muted-foreground">→</span> {c.to}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {c.direction === "CUSTOMER_TO_SA" ? "Customer called the shop" : "Shop called the customer"}
                {" · "}
                {formatRelative(c.startedAt)}
                {duration && ` · ${duration}`}
                {bookingHref && c.booking && (
                  <>
                    {" · "}
                    <Link href={bookingHref(c.booking.id)} className="font-mono hover:text-foreground">
                      {c.booking.code}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[0.7rem]", outcome.tone)}>
              {outcome.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
