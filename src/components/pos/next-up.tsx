import Link from "next/link";
import { ArrowRight, CalendarClock, Check, ShieldAlert } from "lucide-react";
import { TONE_CLASS, type Tone } from "@/lib/booking/status-meta";
import { cn } from "@/lib/utils";
import { Elapsed } from "./elapsed";

export type NextUpItem = {
  id: string;
  href: string;
  /** The move, named as the person would say it: "Confirm the booking". */
  action: string;
  vehicle: string;
  plate: string;
  customer: string;
  slotLabel: string | null;
  sinceIso: string;
  sinceLabel: string;
  stalled: boolean;
  hasIssue: boolean;
  tone: Tone;
};

/**
 * The one block that answers "what do I do next".
 *
 * Ordered by how long each job has been sitting, not by status, because a car
 * that has waited since yesterday morning matters more than whichever stage it
 * happens to be in. The action is the headline on every row — the vehicle is how
 * you recognise it, but the verb is the job.
 */
export function NextUp({
  items,
  total,
  allHref,
  emptyHint,
}: {
  items: NextUpItem[];
  total: number;
  allHref: string;
  emptyHint: string;
}) {
  if (!items.length) {
    return (
      <section className="panel flex items-center gap-4 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
          <Check className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-foreground">Nothing is waiting on you.</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{emptyHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 border-b border-line/70 px-5 py-3.5">
        <h2 className="font-display-md text-base text-foreground">Next up</h2>
        {total > items.length && (
          <Link
            href={allHref}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {total - items.length} more
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </header>

      <ol className="divide-y divide-line/60">
        {items.map((item, i) => {
          const tone = TONE_CLASS[item.tone];
          // The oldest wait is the one to do first, so it is the only row that
          // gets to use the shop's signal colour.
          const first = i === 0;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-5 py-4 transition-colors hover:bg-surface-2/50"
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 left-0 w-0.5 transition-opacity",
                    first ? "bg-amber" : cn(tone.dot, "opacity-45"),
                  )}
                />
                <span
                  className={cn(
                    "grid size-2 place-items-center rounded-full",
                    tone.dot,
                    first && "pulse-dot",
                  )}
                  style={first ? { color: "var(--amber)" } : undefined}
                  aria-hidden
                />

                <div className="min-w-0">
                  <p
                    className={cn(
                      "flex items-center gap-2 truncate",
                      first ? "text-[1.05rem] text-foreground" : "text-foreground",
                    )}
                  >
                    {item.action}
                    {item.hasIssue && (
                      <ShieldAlert
                        className="size-3.5 shrink-0 text-signal-red"
                        aria-label="Open QC issue"
                      />
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {item.vehicle} <span className="readout text-xs">{item.plate}</span> ·{" "}
                    {item.customer}
                    {item.slotLabel && (
                      <span className="hidden sm:inline">
                        {" "}
                        <CalendarClock className="mb-0.5 inline size-3" /> {item.slotLabel}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 justify-self-end">
                  <span
                    className={cn(
                      "readout text-right text-xs",
                      item.stalled ? "text-amber-ink" : "text-muted-foreground",
                    )}
                  >
                    <Elapsed since={item.sinceIso} initial={item.sinceLabel} />
                    <span className="block text-[0.65rem] text-muted-foreground/70">waiting</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
