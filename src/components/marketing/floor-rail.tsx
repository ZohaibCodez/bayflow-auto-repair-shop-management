"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { LAST_STAGE, MILESTONES, milestoneFor, useLiveJob } from "./live-job";

/** The gap between the first and last node, as a share of the rail's width. */
const SPAN = 75; // 4 columns → the node centres sit 3/4 of the width apart

/** A car from above, pointing right. */
function Car({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 18" className={className} aria-hidden>
      <path
        d="M1.5 12.6c.4-3 1.4-3.9 4.4-4.3l6.6-.7 4.5-4a2.6 2.6 0 0 1 1.8-.7h6a2.6 2.6 0 0 1 2 .9l4.1 4.5 4.5.8c2 .4 2.8 1.4 2.8 3.5Z"
        fill="currentColor"
      />
      <circle cx="11" cy="12.8" r="3.2" fill="currentColor" />
      <circle cx="30" cy="12.8" r="3.2" fill="currentColor" />
    </svg>
  );
}

/**
 * The job, running along the floor of the hero.
 *
 * It shows the same four milestones as the card above it, reading off the same
 * live job — so the page says one thing in two registers rather than animating
 * decoration. The car travels between milestones on a spring: a job is handed
 * over, it does not slide.
 */
export function FloorRail() {
  const { stage } = useLiveJob();
  const reduce = useReducedMotion();
  const active = milestoneFor(stage);
  const done = stage === LAST_STAGE;
  const at = (i: number) => `calc(0.875rem + ${(SPAN * i) / (MILESTONES.length - 1)}%)`;

  return (
    <div className="relative" aria-hidden>
      {/* the rail */}
      <span
        className="absolute top-3.5 h-px bg-line"
        style={{ left: "0.875rem", width: `${SPAN}%` }}
      />
      <motion.span
        className="absolute top-3.5 h-px origin-left"
        style={{
          left: "0.875rem",
          width: `${SPAN}%`,
          background: "linear-gradient(90deg, var(--amber), var(--teal))",
        }}
        animate={{ scaleX: active / (MILESTONES.length - 1) }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 18 }}
      />

      {/* the car, travelling between milestones */}
      <motion.span
        className={cn(
          "absolute top-3.5 z-10 -translate-x-1/2 -translate-y-1/2",
          done ? "text-teal" : "text-amber",
        )}
        animate={{ left: at(active) }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 60, damping: 16 }}
        style={{ filter: "drop-shadow(0 0 10px currentColor)" }}
      >
        <Car className="h-4 w-9" />
      </motion.span>

      {/* the milestones */}
      <ol className="relative grid grid-cols-4">
        {MILESTONES.map((m, i) => {
          const passed = i < active;
          const here = i === active;
          const Icon = passed ? MILESTONES[0].icon : m.icon;
          return (
            <li key={m.label} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border bg-ink transition-colors duration-500",
                  passed && "border-teal/60 text-teal-ink",
                  here && "border-amber/70 bg-amber/15 text-amber-ink",
                  !passed && !here && "border-line text-muted-foreground/50",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 pt-0.5">
                <span
                  className={cn(
                    "block truncate text-xs",
                    passed || here ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {i + 1}. {m.label}
                </span>
                <span className="readout block truncate text-[0.65rem] text-muted-foreground/70">
                  {passed ? (m.at ?? "done") : here ? (m.at ?? "in progress") : "—"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
