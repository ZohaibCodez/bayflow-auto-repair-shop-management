"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { BOOKING_STAGES } from "@/lib/booking/statuses";

const LAST = BOOKING_STAGES.length - 1;

export function Pipeline() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(reduce ? LAST : 0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setActive((i) => (i >= LAST ? 0 : i + 1));
    }, 1150);
    return () => clearInterval(id);
  }, [reduce]);

  const pct = (active / LAST) * 100;
  const atReady = active === LAST;

  return (
    <div className="relative rounded-xl border border-line bg-surface/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-6">
      {/* readout header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal/60" />
            <span className="relative inline-flex size-2 rounded-full bg-teal" />
          </span>
          <span className="font-mono text-xs tracking-wide text-muted-foreground">
            LEA-1234 · Honda Civic
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={active}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className={`font-display-md text-sm ${atReady ? "text-teal" : "text-amber"}`}
          >
            {BOOKING_STAGES[active].label}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* track */}
      <div className="relative mt-8 mb-2">
        <div className="h-[3px] w-full rounded-full bg-line" />
        <motion.div
          className="absolute left-0 top-0 h-[3px] rounded-full"
          style={{ background: atReady ? "var(--teal)" : "var(--amber)" }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />

        {/* stations */}
        <div className="absolute inset-x-0 top-0 flex -translate-y-1/2 justify-between">
          {BOOKING_STAGES.map((s, i) => {
            const reached = i <= active;
            return (
              <div key={s.key} className="flex flex-col items-center">
                <span
                  className={`size-3 rounded-full border transition-colors duration-300 ${
                    reached
                      ? atReady
                        ? "border-teal bg-teal"
                        : "border-amber bg-amber"
                      : "border-line bg-surface"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* the job token */}
        <motion.div
          className="absolute top-0 -translate-x-1/2 -translate-y-1/2"
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        >
          <span
            className="block size-4 rounded-full ring-4 ring-ink"
            style={{
              background: atReady ? "var(--teal)" : "var(--amber)",
              boxShadow: `0 0 18px 2px ${atReady ? "var(--teal)" : "var(--amber)"}`,
            }}
          />
        </motion.div>
      </div>

      {/* station labels (md+) */}
      <div className="mt-4 hidden justify-between md:flex">
        {BOOKING_STAGES.map((s, i) => (
          <span
            key={s.key}
            className={`w-10 text-center text-[10px] leading-tight transition-colors duration-300 ${
              i <= active ? "text-steel" : "text-muted-foreground/45"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* footer readout */}
      <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-4 text-xs">
        <span className="text-muted-foreground">
          Stage{" "}
          <span className="font-mono text-foreground">
            {String(active + 1).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground/60"> / {BOOKING_STAGES.length}</span>
        </span>
        <span className="text-muted-foreground">
          {atReady ? "Ready for pick-up" : "Updated just now"}
        </span>
      </div>
    </div>
  );
}
