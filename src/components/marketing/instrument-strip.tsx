"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { trackPointer } from "@/lib/pointer";
import { Odometer } from "@/components/number-reel";

export type Readout = { label: string; value: number; note: string };

/**
 * Live shop telemetry, built like the instrument cluster it describes rather
 * than a row of marketing stat cards: mono readouts on an odometer, ruled off
 * from each other, under a lamp that pans across the whole bar.
 */
export function InstrumentStrip({ readouts }: { readouts: Readout[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();

  // The lamp pass, as a motion value so the whole bar shares one animation.
  const sweep = useMotionValue(-30);
  const sweepPos = useMotionTemplate`${sweep}%`;

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(sweep, 130, {
      duration: 4.2,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 5.5,
    });
    return () => controls.stop();
  }, [inView, reduce, sweep]);

  return (
    <section className="relative overflow-hidden border-y border-line/70 bg-ink">
      {/* The lamp passing over the bar. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[26%] -translate-x-1/2"
        style={{
          left: sweepPos,
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--amber) 13%, transparent), transparent)",
        }}
      />

      <div ref={ref} className="relative mx-auto max-w-6xl px-4 pt-7 sm:px-6">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="pulse-dot size-1.5 rounded-full bg-teal text-teal" />
          Live from the floor, counted when this page loaded
        </p>

        {/* The 1px grid gap is the hairline, so cells rule off from each other
            and from the row above when they wrap. */}
        <dl className="-mx-4 mt-6 grid grid-cols-2 gap-px bg-line/55 sm:-mx-6 sm:grid-cols-3 lg:grid-cols-5">
          {readouts.map((r, i) => (
            <div
              key={r.label}
              onPointerMove={trackPointer}
              className="spotlight group relative bg-ink px-4 pt-5 pb-6 transition-colors sm:px-6"
              style={
                reduce
                  ? undefined
                  : {
                      animation: `hero-in .6s cubic-bezier(.16,1,.3,1) ${i * 70}ms backwards`,
                    }
              }
            >
              {/* Lights up as you reach for it. */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-amber transition-transform duration-500 group-hover:scale-x-100" />
              <dd className="text-[2rem] text-foreground tabular sm:text-[2.5rem]">
                <Odometer value={r.value} active={inView} />
              </dd>
              <dt className="mt-2 text-[0.82rem] leading-snug text-foreground">{r.label}</dt>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{r.note}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
