"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ShieldAlert } from "lucide-react";
import { PHASES, STATUS_META, TONE_CLASS, statusLabel } from "@/lib/booking/status-meta";
import { cn } from "@/lib/utils";
import { trackPointer } from "@/lib/pointer";
import { Elapsed } from "./elapsed";

export type FloorCar = {
  id: string;
  code: string;
  /** Built on the server: a function can't cross into a client component. */
  href: string;
  status: keyof typeof STATUS_META;
  plate: string;
  vehicle: string;
  customer: string;
  sinceIso: string;
  sinceLabel: string;
  stalled: boolean;
  hasIssue: boolean;
};

/**
 * The shop floor: every live car, in the bay it is standing in.
 *
 * Each car carries a `layoutId`, so when a job changes status the page's live
 * refresh doesn't redraw the board — the car *travels* to its new bay while you
 * watch. That is the whole product in one gesture, and it is the same pipeline
 * the public site shows customers.
 */
export function FloorBoard({ cars }: { cars: FloorCar[] }) {
  const reduce = useReducedMotion();
  const byPhase = PHASES.map((_, phase) =>
    cars.filter((c) => STATUS_META[c.status].phase === phase),
  );
  const busiest = Math.max(1, ...byPhase.map((p) => p.length));

  // ---- Arrival flash --------------------------------------------------
  // Which cars moved bays *since the previous render* (a live refresh picked
  // up someone else's action). A car that changes bay is unmounted from its
  // old <ul> and mounted into a new one — layoutId still carries it smoothly
  // across that move, but the component instance is fresh, so "did this car
  // just arrive" has to be decided up here, not inside <Car>.
  //
  // Derived from props during render (React's documented pattern for
  // "adjusting state when a prop changes"), not a ref: reading a ref's
  // current value during render is unsafe once renders can be retried, and
  // the server hands this component a fresh `cars` array on every poll, so
  // the identity check below fires exactly once per real refresh.
  const [prevCars, setPrevCars] = useState(cars);
  const [justArrived, setJustArrived] = useState<ReadonlySet<string>>(() => new Set());
  if (cars !== prevCars) {
    const prevStatusById = new Map(prevCars.map((c) => [c.id, c.status]));
    const moved = new Set<string>();
    for (const c of cars) {
      const was = prevStatusById.get(c.id);
      if (was !== undefined && was !== c.status) moved.add(c.id);
    }
    setJustArrived(moved);
    setPrevCars(cars);
  }

  return (
    <LayoutGroup id="floor">
      {/* The board is wider than a phone; it scrolls, and the edge fades so it
          is obvious there is more of the shop off to the right. */}
      <div className="-mx-4 overflow-x-auto px-4 pt-1.5 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [mask-image:linear-gradient(to_right,transparent,#000_1rem,#000_calc(100%-1rem),transparent)] lg:[mask-image:none]">
        <div className="grid min-w-[64rem] grid-cols-7 gap-3">
          {PHASES.map((label, phase) => {
            const here = byPhase[phase];
            const stalled = here.filter((c) => c.stalled).length;
            return (
              <section key={label} className="min-w-0">
                {/* ---- Bay head: the rail, then the name and the count ---- */}
                <div className="relative mb-3 pt-3">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px bg-line"
                    style={{
                      // The rail is lit in proportion to how loaded the bay is.
                      opacity: 0.4 + (here.length / busiest) * 0.6,
                    }}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0 left-0 size-1.5 -translate-y-1/2 rounded-full",
                      stalled ? "bg-amber" : here.length ? "bg-steel" : "bg-line",
                    )}
                  />
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-xs text-foreground">{label}</h3>
                    <span
                      className={cn(
                        "readout text-xs",
                        here.length ? "text-steel" : "text-muted-foreground/50",
                      )}
                    >
                      {here.length}
                    </span>
                  </div>
                  {stalled > 0 && (
                    <p className="readout mt-0.5 text-[0.65rem] text-amber-ink">
                      {stalled} waiting
                    </p>
                  )}
                </div>

                {/* ---- The cars standing in this bay ---- */}
                <ul className="space-y-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {here.map((car) => (
                      <Car
                        key={car.id}
                        car={car}
                        reduce={Boolean(reduce)}
                        justArrived={justArrived.has(car.id)}
                      />
                    ))}
                  </AnimatePresence>
                  {here.length === 0 && (
                    <li
                      aria-hidden
                      className="h-16 rounded-lg border border-dashed border-line/60"
                    />
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}

function Car({
  car,
  reduce,
  justArrived,
}: {
  car: FloorCar;
  reduce: boolean;
  justArrived: boolean;
}) {
  const tone = TONE_CLASS[STATUS_META[car.status].tone];
  return (
    <motion.li
      layout={!reduce}
      layoutId={reduce ? undefined : car.id}
      initial={reduce ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 240, damping: 28, mass: 0.7 }}
    >
      <Link
        href={car.href}
        onPointerMove={trackPointer}
        aria-label={`${car.vehicle} ${car.plate} — ${statusLabel(car.status)}, ${car.sinceLabel} in this stage`}
        className={cn(
          "spotlight relative block overflow-hidden rounded-lg border bg-surface py-2.5 pr-2.5 pl-3 transition-[border-color,transform] duration-300 hover:-translate-y-0.5",
          car.stalled ? "border-amber/50" : "border-line hover:border-steel/40",
        )}
      >
        {/* A hand-off reads as a beat of light: this bay just received the
            job, so a ring blooms from the stage colour and fades. Driven by
            FloorBoard comparing this render to the last — never fires on the
            first paint, only when a live refresh moves a car. */}
        {justArrived && !reduce && (
          <motion.span
            aria-hidden
            className={cn("pointer-events-none absolute -inset-px rounded-lg", tone.text)}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ boxShadow: "0 0 0 1.5px currentColor, 0 0 18px 1px currentColor" }}
          />
        )}

        {/* Which stage, as a colour, without spending a line of text on it. */}
        <span className={cn("absolute inset-y-0 left-0 w-0.5", tone.dot)} aria-hidden />

        <div className="flex items-center justify-between gap-1.5">
          <span className="readout truncate text-xs text-foreground">{car.plate}</span>
          {car.hasIssue && (
            <ShieldAlert className="size-3 shrink-0 text-signal-red" aria-label="Open QC issue" />
          )}
        </div>
        <p className="mt-0.5 truncate text-[0.7rem] leading-tight text-steel">{car.vehicle}</p>
        <p className="truncate text-[0.7rem] leading-tight text-muted-foreground">{car.customer}</p>

        <p
          className={cn(
            "readout mt-1.5 flex items-center gap-1 text-[0.65rem]",
            car.stalled ? "text-amber-ink" : "text-muted-foreground/70",
          )}
        >
          {car.stalled && <span className="size-1 rounded-full bg-amber" aria-hidden />}
          <Elapsed since={car.sinceIso} initial={car.sinceLabel} />
        </p>
      </Link>
    </motion.li>
  );
}
