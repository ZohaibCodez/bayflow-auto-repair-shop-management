"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { BOOKING_STAGES } from "@/lib/booking/statuses";

const LAST = BOOKING_STAGES.length - 1;
const DWELL = 2400; // ms a job spends on screen at each stage

/**
 * The hero's focal object: the job card that travels with the car.
 *
 * In a real shop this is a paper card that moves bay to bay, so it is the one
 * thing worth animating here — it carries the whole product idea (a job always
 * has exactly one holder and one place) without a word of explanation. It sits
 * on a plane that tilts toward the pointer, with its contents at different
 * depths so the parallax is real rather than a drop shadow.
 */
export function JobCard() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(reduce ? LAST : 0);
  const [elapsed, setElapsed] = useState(74 * 60); // seconds on the job so far
  const ref = useRef<HTMLDivElement>(null);

  // Tilt. Springs so the card settles rather than tracking the pointer rigidly.
  const spring = { stiffness: 140, damping: 18, mass: 0.6 };
  const rotX = useSpring(0, spring);
  const rotY = useSpring(0, spring);
  // Specular highlight position, in percent of the card.
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(0);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX}% ${glareY}%, color-mix(in oklab, var(--amber) 22%, transparent), transparent 62%)`;

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStage((i) => (i >= LAST ? 0 : i + 1)), DWELL);
    return () => clearInterval(id);
  }, [reduce]);

  // A clock that actually ticks, so the readout is never a frozen prop.
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [reduce]);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rotY.set((px - 0.5) * 14);
    rotX.set((0.5 - py) * 10);
    glareX.set(px * 100);
    glareY.set(py * 100);
  }

  function onPointerLeave() {
    rotY.set(0);
    rotX.set(0);
    glareX.set(50);
    glareY.set(0);
  }

  const current = BOOKING_STAGES[stage];
  const ready = stage === LAST;
  // Two accents on purpose: the bright one for fills and glows, the -ink one
  // for anything set as TEXT, which has to clear 4.5:1 on paper in light mode.
  const accent = ready ? "var(--teal)" : "var(--amber)";
  const accentText = ready ? "var(--teal-ink)" : "var(--amber-ink)";
  const pct = Math.round((stage / LAST) * 100);
  const clock = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(
    Math.floor((elapsed % 3600) / 60),
  ).padStart(2, "0")}`;

  return (
    <div className="[perspective:1500px]" ref={ref}>
      <motion.div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className="relative rounded-2xl border border-line/90 bg-surface/85 shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        {/* Light raking across the face, following the pointer. */}
        <motion.span
          aria-hidden
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 rounded-2xl"
        />
        {/* Thin lit edge along the top — the card catching the work lamp. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 -top-px h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />

        <div className="relative p-5 sm:p-6" style={{ transform: "translateZ(24px)" }}>
          {/* ---- Vehicle ---- */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="readout text-base text-foreground sm:text-lg">LEA&#8209;1234</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Honda Civic 2019</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface-2/80 px-2.5 py-1">
              <span
                className="pulse-dot size-1.5 rounded-full"
                style={{ background: accent, color: accent }}
              />
              <span className="readout text-[0.68rem] text-muted-foreground">
                {ready ? "ready" : "in progress"}
              </span>
            </div>
          </div>

          {/* ---- Stage rail ---- */}
          <div className="relative mt-7 h-10">
            <div className="absolute inset-x-0 top-1.5 h-px bg-line" />
            <motion.div
              className="absolute left-0 top-1.5 h-px"
              style={{ background: accent }}
              animate={{ width: `${pct}%` }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20 }}
            />
            <ol className="absolute inset-x-0 top-0 flex justify-between">
              {BOOKING_STAGES.map((s, i) => {
                const done = i < stage;
                const active = i === stage;
                return (
                  <li key={s.key} className="relative grid place-items-center">
                    <span className="sr-only">{s.label}</span>
                    <span
                      className="block size-3 rounded-full border-2 transition-[background-color,border-color,transform] duration-300"
                      style={{
                        borderColor:
                          done || active
                            ? accent
                            : "color-mix(in oklab, var(--steel) 55%, transparent)",
                        background: done ? accent : "var(--surface)",
                        transform: active ? "scale(1.25)" : "scale(1)",
                      }}
                    />
                    {active && !reduce && (
                      <motion.span
                        // Ripple out of the station the job just reached.
                        key={`ping-${i}`}
                        aria-hidden
                        className="absolute top-0 size-3 rounded-full"
                        style={{ border: `1.5px solid ${accent}` }}
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 3.2, opacity: 0 }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ---- Current stage ---- */}
          <div className="mt-2 min-h-[4.5rem]" aria-live="polite" aria-atomic>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.key}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              >
                <p
                  className="font-display-md text-2xl sm:text-[1.7rem]"
                  style={{ color: accentText }}
                >
                  {current.label}
                </p>
                <p className="mt-1 text-sm text-steel">
                  {current.owner} &middot; {current.where}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ---- Readouts ---- */}
          <dl className="hairline-t mt-5 grid grid-cols-3 gap-3 pt-4">
            {[
              ["Stage", `${String(stage + 1).padStart(2, "0")}/${BOOKING_STAGES.length}`],
              ["On the job", clock],
              ["Estimate", stage >= 4 ? "PKR 18,400" : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
                <dd className="readout mt-0.5 text-sm text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ---- The chit that pops off the card when the car is signed off ----
            Lifted well above the surface so the tilt parallaxes it visibly. */}
        <AnimatePresence>
          {ready && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ transform: "translateZ(70px)" }}
              className="absolute -bottom-5 -left-3 flex items-center gap-2 rounded-xl border border-teal/40 bg-surface px-3.5 py-2.5 shadow-xl shadow-black/25 sm:-left-6"
            >
              <span className="grid size-6 place-items-center rounded-md bg-teal/15">
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path
                    d="M3 8.5 6.2 11.6 13 4.8"
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-sm text-foreground">
                Signed off by Sana K.
                <span className="block text-xs text-teal-ink">Customer notified</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
