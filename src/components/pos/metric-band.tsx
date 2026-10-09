import { cn } from "@/lib/utils";

export type Metric = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "amber" | "teal" | "red";
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
 * actually needs looking at.
 */
export function MetricBand({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line/60 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m) => (
        <div key={m.label} className="bg-surface px-4 py-3.5">
          <dt className="truncate text-xs text-muted-foreground">{m.label}</dt>
          <dd className={cn("readout mt-1 truncate text-xl", TONE[m.tone ?? "default"])}>
            {m.value}
          </dd>
          {m.hint && (
            <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground/80">{m.hint}</p>
          )}
        </div>
      ))}
    </dl>
  );
}
