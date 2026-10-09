"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { LIFECYCLE } from "@/lib/booking/statuses";
import { IMAGES } from "@/lib/images";
import { FallbackImage } from "@/components/fallback-image";

const LAST = LIFECYCLE.length - 1;

/** Side profile, pointing right — the token that travels the lane. */
function Car({ className, fill }: { className?: string; fill: string }) {
  return (
    <svg viewBox="0 0 40 18" className={className} aria-hidden>
      <path
        d="M1.5 12.6c.4-3 1.4-3.9 4.4-4.3l6.6-.7 4.5-4a2.6 2.6 0 0 1 1.8-.7h6a2.6 2.6 0 0 1 2 .9l4.1 4.5 4.5.8c2 .4 2.8 1.4 2.8 3.5Z"
        fill={fill}
      />
      <circle cx="11" cy="12.8" r="3.2" fill={fill} />
      <circle cx="30" cy="12.8" r="3.2" fill={fill} />
      <circle cx="11" cy="12.8" r="1.2" fill="var(--ink)" />
      <circle cx="30" cy="12.8" r="1.2" fill="var(--ink)" />
    </svg>
  );
}

/**
 * The pit lane — the page's one scroll-driven set piece.
 *
 * Scrolling the tall outer section hands the car from bay to bay along a lane
 * while the panel beside it shows who holds the job there. The scroll position
 * chooses the bay; the car then *travels* to it on a spring, because that is
 * what actually happens on a shop floor — a job doesn't slide continuously, it
 * is handed over. A hairline at the foot of the stage stays tied directly to
 * scroll so the connection between the two is never ambiguous.
 */
export function PitLane() {
  const section = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });

  /** Scroll picks the bay. The last stage holds a little longer so the page
      doesn't snap away from "Ready for pick-up" the moment it arrives. */
  const bayIndex = (p: number) =>
    Math.min(LAST, Math.max(0, Math.floor(p * (LIFECYCLE.length + 0.35))));

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = bayIndex(p);
    setIndex((prev) => (prev === next ? prev : next));
  });

  // The car travels to the chosen bay: scroll snaps the target, the spring
  // carries it there — a job is handed over, it doesn't slide.
  const target = useTransform(scrollYProgress, (p) => (bayIndex(p) / LAST) * 100);
  const bay = useSpring(target, {
    stiffness: 70,
    damping: 16,
    mass: 0.9,
    skipInitialAnimation: true,
  });
  const carLeft = useMotionTemplate`${bay}%`;
  // It leans on its suspension as it sets off and settles.
  const velocity = useVelocity(bay);
  const lean = useTransform(velocity, [-260, 0, 260], [2.6, 0, -2.6], { clamp: true });

  const scrubProgress = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const scrubWidth = useMotionTemplate`${scrubProgress}%`;

  const step = LIFECYCLE[index];
  const atEnd = index === LAST;
  const accent = atEnd ? "var(--teal)" : "var(--amber)";

  return (
    <section
      ref={section}
      id="how"
      className="relative border-t border-line/60 bg-ink"
      style={{ height: `${(LIFECYCLE.length + 1) * 58}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        {/* Light pooling over the active bay, sliding with the car. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-40 size-[640px] -translate-x-1/2 rounded-full opacity-60 blur-[90px]"
          style={{
            left: carLeft,
            background: `radial-gradient(circle, color-mix(in oklab, ${accent} 18%, transparent), transparent 70%)`,
          }}
        />

        {/* The stage is exactly one viewport tall and clips, so on short screens
            everything above the lane gives way — the lane must never be cut off. */}
        <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pt-24 pb-8 sm:px-6 lg:pt-28 short:pb-4 short:lg:pt-24">
          {/* ---- Section head ---- */}
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display-md text-[clamp(1.5rem,2.6vw,2rem)] text-foreground">
                How a repair flows
              </h2>
              <p className="mt-3 max-w-[48ch] text-sm text-muted-foreground sm:text-base short:mt-2 short:sm:text-sm shorter:hidden">
                Seven bays, in a fixed order. Each one has exactly one person responsible, and
                nothing jumps the queue — so the car&rsquo;s status is never a guess.
              </p>
            </div>
            <p className="readout hidden shrink-0 pt-1 text-sm text-muted-foreground sm:block">
              <span className="text-xl text-foreground">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-muted-foreground/60"> / {LIFECYCLE.length}</span>
            </p>
          </div>

          {/* ---- Active bay ---- */}
          <div className="mt-6 min-h-0 flex-1 lg:mt-8 short:mt-4 short:lg:mt-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step.label}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24, filter: "blur(8px)" }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="grid h-full gap-7 sm:grid-cols-[1.05fr_0.95fr] sm:grid-rows-[minmax(0,1fr)] lg:gap-14"
              >
                <div className="self-center">
                  <span
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                    style={{
                      borderColor: `color-mix(in oklab, ${accent} 40%, transparent)`,
                      background: `color-mix(in oklab, ${accent} 10%, transparent)`,
                      color: atEnd ? "var(--teal-ink)" : "var(--amber-ink)",
                    }}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: accent }} />
                    {step.owner}
                  </span>
                  <h3 className="display mt-4 text-[clamp(1.9rem,4.4vw,3rem)] text-foreground short:mt-3 short:text-[clamp(1.6rem,min(4.4vw,7vh),3rem)]">
                    {step.label}
                  </h3>
                  <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-steel sm:text-lg short:mt-3 short:sm:text-base">
                    {step.blurb}
                  </p>
                </div>

                <div className="relative h-full min-h-56 overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-2xl shadow-black/25 short:sm:min-h-0">
                  {/* Absolutely placed so the photo fills the space the layout leaves it
                      instead of sizing the bay from its own aspect ratio, which pushed
                      the lane off the bottom of the screen. */}
                  <FallbackImage
                    src={IMAGES.lifecycle[index] ?? ""}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                    fallback={<div className="absolute inset-0 bay-floor opacity-60" aria-hidden />}
                  />
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                    }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ---- The lane -------------------------------------------------
              All seven bays stay on screen and labelled, so the sequence is
              readable at a glance (and to a screen reader) without scrolling
              through it. */}
          <ol className="relative mt-8 h-20 shrink-0 lg:mt-10 short:mt-4 short:h-16 short:lg:mt-5">
            <span className="absolute inset-x-0 top-6 h-px bg-line" aria-hidden />
            <motion.span
              aria-hidden
              className="absolute left-0 top-6 h-px"
              style={{ width: carLeft, background: accent }}
            />

            {LIFECYCLE.map((s, i) => {
              const passed = i < index;
              const here = i === index;
              return (
                <li
                  key={s.label}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${(i / LAST) * 100}%` }}
                  aria-current={here ? "step" : undefined}
                >
                  <span className="h-6" />
                  <span
                    className="block size-2.5 rounded-full border-2 transition-all duration-300"
                    style={{
                      borderColor: passed || here ? accent : "var(--line)",
                      background: passed ? accent : "var(--ink)",
                      transform: here ? "scale(1.4)" : "scale(1)",
                    }}
                  />
                  <span
                    className={`mt-3 hidden w-24 text-center text-[11px] leading-tight transition-colors duration-300 sm:block ${
                      here ? "text-foreground" : passed ? "text-steel" : "text-muted-foreground/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}

            {/* The car itself, riding the lane. */}
            <motion.span
              aria-hidden
              className="absolute top-6 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: carLeft, rotate: reduce ? 0 : lean }}
            >
              <span
                className="block rounded-full p-1"
                style={{
                  filter: `drop-shadow(0 0 12px color-mix(in oklab, ${accent} 60%, transparent))`,
                }}
              >
                <Car className="h-5 w-11" fill={accent} />
              </span>
            </motion.span>
          </ol>
        </div>

        {/* Scroll scrub readout — tied straight to scroll position. */}
        <div className="relative h-px w-full bg-line/60" aria-hidden>
          <motion.div className="h-px" style={{ width: scrubWidth, background: accent }} />
        </div>
      </div>
    </section>
  );
}
