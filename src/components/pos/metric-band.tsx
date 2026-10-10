"use client";

import { trackPointer } from "@/lib/pointer";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/money";
import { CountUp } from "@/components/number-reel";

/** How to play `raw` back as text. A function prop can't cross the server→client
 *  boundary, so the formatter lives here and the server only sends a tag. */
export type MetricUnit = "pkr" | "percent" | "hours" | "days";

const FORMAT: Record<MetricUnit, (n: number) => string> = {
  pkr: formatPKR,
  percent: (n) => `${Math.round(n)}%`,
  hours: (n) => `${n.toFixed(1)} h`,
  days: (n) => `${n.toFixed(1)} d`,
};

export type Metric = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "amber" | "teal" | "red";
  /** When `raw` and `unit` are both present, the tile counts up from 0 to
   *  `raw` on first paint instead of appearing static. `FORMAT[unit](raw)`
   *  must equal `value` — it is the real number this tile reports, just
   *  played back as a reel instead of a jump cut, never a cosmetic figure. */
  raw?: number;
  unit?: MetricUnit;
};

const TONE = {
  default: "text-foreground",
  amber: "text-amber-ink",
  teal: "text-teal-ink",
  red: "text-signal-red",
} as const;

/**
 * The owner's numbers as one instrument band rather than a row of cards.
 *
 * On a working screen these are reference, not headlines — the job queue and the
 * floor are what people act on. So they get mono readouts ruled off from each
 * other and nothing else: no borders, no shadows, no colour unless a figure
 * actually needs looking at. A spotlight follows the pointer on hover (the same
 * one the landing page's instrument strip uses) and each tile settles into
 * place a beat after the one before it.
 */
export function MetricBand({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line/60 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          onPointerMove={trackPointer}
          className="spotlight group relative bg-surface px-4 py-3.5 transition-colors"
          style={{ animation: `hero-in .5s cubic-bezier(.16,1,.3,1) ${i * 65}ms backwards` }}
        >
          {/* Lights up as you reach for it — the same tell the landing page's
              instrument strip uses, so a live figure always reads the same way. */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-amber transition-transform duration-500 group-hover:scale-x-100" />
          <dt className="truncate text-xs text-muted-foreground">{m.label}</dt>
          <dd className={cn("readout mt-1 truncate text-xl", TONE[m.tone ?? "default"])}>
            {m.raw != null && m.unit ? (
              <CountUp value={m.raw} format={FORMAT[m.unit]} />
            ) : (
              m.value
            )}
          </dd>
          {m.hint && (
            <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground/80">{m.hint}</p>
          )}
        </div>
      ))}
    </dl>
  );
}
