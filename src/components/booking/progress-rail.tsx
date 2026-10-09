import type { BookingStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PHASES, STATUS_META, TONE_CLASS } from "@/lib/booking/status-meta";

/** Seven-phase pipeline. `compact` is a slim segmented bar for lists. */
export function ProgressRail({
  status,
  compact = false,
  className,
}: {
  status: BookingStatus;
  compact?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const current = meta.phase;
  const cancelled = status === "CANCELLED";
  const tone = TONE_CLASS[meta.tone];

  if (compact) {
    return (
      <div className={cn("flex gap-1", className)} aria-hidden>
        {PHASES.map((p, i) => (
          <span
            key={p}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              cancelled
                ? "bg-line"
                : i < current
                  ? "bg-steel/60"
                  : i === current
                    ? tone.dot
                    : "bg-line",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <ol className={cn("grid grid-cols-7 gap-1.5", className)}>
      {PHASES.map((p, i) => {
        const done = !cancelled && i < current;
        const active = !cancelled && i === current;
        return (
          <li key={p} className="min-w-0">
            <div
              className={cn(
                "h-1.5 rounded-full",
                done ? "bg-steel/60" : active ? tone.dot : "bg-line",
              )}
            />
            <div className="mt-2 flex items-center gap-1">
              {done && <Check className="size-3 shrink-0 text-steel" />}
              <span
                className={cn(
                  "truncate text-[11px] sm:text-xs",
                  active ? cn("font-medium", tone.text) : done ? "text-steel" : "text-muted-foreground/60",
                )}
              >
                {p}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
