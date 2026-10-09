"use client";

import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { Check, ChevronRight, Wrench } from "lucide-react";
import { BOOKING_STAGES } from "@/lib/booking/statuses";
import { FallbackImage } from "@/components/fallback-image";
import { IMAGES } from "@/lib/images";
import { cn } from "@/lib/utils";
import { LAST_STAGE, MILESTONES, milestoneFor, useLiveJob } from "./live-job";

/** What the shop is doing right now, per stage. */
const TASK: Record<number, { title: string; detail: string; image: string | null }> = {
  0: { title: "Booking received", detail: "Waiting for the front desk to confirm", image: null },
  1: { title: "Confirmed", detail: "Finding a technician with a free bay", image: null },
  2: { title: "Assigned to a bay", detail: "Tariq M. is taking the car in", image: IMAGES.lifecycle[1] },
  3: { title: "Engine diagnostics", detail: "Checking fault codes and sensor data", image: IMAGES.lifecycle[2] },
  4: { title: "Estimate written", detail: "Every part and hour itemised for you", image: IMAGES.lifecycle[3] },
  5: { title: "Estimate approved", detail: "You approved it from your phone", image: IMAGES.lifecycle[3] },
  6: { title: "Parts allocated", detail: "Reserved from the shelf against this job", image: IMAGES.lifecycle[4] },
  7: { title: "Repair underway", detail: "Coil pack and oil service in bay 3", image: IMAGES.lifecycle[4] },
  8: { title: "Road test and sign-off", detail: "A second inspector checks the work", image: IMAGES.lifecycle[5] },
  9: { title: "Ready for pick-up", detail: "Signed off by Sana K. — come and collect", image: IMAGES.lifecycle[6] },
};

/**
 * The hero's focal object: the job card that travels with the car.
 *
 * In a real shop this is the paper card that moves bay to bay, so it is the one
 * thing worth animating here — it carries the whole product idea without a word
 * of explanation. It sits on a plane that tilts toward the pointer, with its
 * contents at different depths so the parallax is real rather than a shadow.
 */
export function JobCard() {
  const reduce = useReducedMotion();
  const { stage, elapsed } = useLiveJob();

  const spring = { stiffness: 140, damping: 18, mass: 0.6 };
  const rotX = useSpring(0, spring);
  const rotY = useSpring(0, spring);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(0);
  const glare = useMotionTemplate`radial-gradient(520px circle at ${glareX}% ${glareY}%, color-mix(in oklab, var(--teal) 14%, transparent), transparent 60%)`;

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rotY.set((px - 0.5) * 10);
    rotX.set((0.5 - py) * 7);
    glareX.set(px * 100);
    glareY.set(py * 100);
  }

  function onPointerLeave() {
    rotY.set(0);
    rotX.set(0);
    glareX.set(50);
    glareY.set(0);
  }

  const ready = stage === LAST_STAGE;
  const task = TASK[stage];
  const current = milestoneFor(stage);
  const progress = Math.round(((stage + 1) / BOOKING_STAGES.length) * 100);
  const clock = [
    Math.floor(elapsed / 3600),
    Math.floor((elapsed % 3600) / 60),
    elapsed % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

  return (
    <div className="[perspective:1600px]">
      <motion.div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className="panel-live relative rounded-2xl bg-surface/80 backdrop-blur-2xl"
      >
        <motion.span
          aria-hidden
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 rounded-2xl"
        />

        <div className="relative p-4 sm:p-5" style={{ transform: "translateZ(26px)" }}>
          {/* ---- Vehicle ---- */}
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2">
              <FallbackImage
                src={IMAGES.defaultShop}
                alt=""
                className="size-full object-cover"
                fallback={<Wrench className="size-5 text-steel" />}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="readout truncate text-[0.95rem] text-foreground">LEA&#8209;1234</p>
              <p className="truncate text-xs text-muted-foreground">Honda Civic 2019</p>
            </div>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem]",
                ready
                  ? "border-teal/40 bg-teal/10 text-teal-ink"
                  : "border-line bg-surface-2/80 text-muted-foreground",
              )}
            >
              <span
                className={cn("pulse-dot size-1.5 rounded-full", ready ? "bg-teal" : "bg-amber")}
                style={{ color: ready ? "var(--teal)" : "var(--amber)" }}
              />
              {ready ? "Ready" : "In progress"}
            </span>
          </div>

          {/* ---- Milestones ---- */}
          <ol className="relative mt-5 grid grid-cols-4 gap-1">
            {MILESTONES.map((m, i) => {
              const done = i < current;
              const here = i === current;
              const Icon = done ? Check : m.icon;
              return (
                <li key={m.label} className="relative flex flex-col items-center text-center">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-3.5 right-1/2 left-[-50%] h-px transition-colors duration-500",
                        done || here ? "bg-teal/70" : "bg-line",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 grid size-7 place-items-center rounded-full border transition-colors duration-500",
                      done && "border-teal/60 bg-teal/15 text-teal-ink",
                      here && "border-amber/70 bg-amber/15 text-amber-ink",
                      !done && !here && "border-line bg-surface text-muted-foreground/60",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 text-[0.68rem] leading-tight",
                      done || here ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {m.label}
                  </span>
                  <span className="readout text-[0.62rem] text-muted-foreground/70">
                    {done || here ? (m.at ?? (here ? "now" : "—")) : "—"}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* ---- The shop ---- */}
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 p-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber/15 text-amber-ink">
              <Wrench className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8rem] text-foreground">Lahore Auto Care</span>
              <span className="block truncate text-[0.68rem] text-muted-foreground">
                Certified workshop &middot; Lahore
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>

          {/* ---- What's happening right now ---- */}
          <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface-2/50">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stage}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 p-2.5"
                aria-live="polite"
              >
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface">
                  {task.image ? (
                    <FallbackImage
                      src={task.image}
                      alt=""
                      className="size-full object-cover"
                      fallback={<Wrench className="size-5 text-steel" />}
                    />
                  ) : (
                    <Wrench className="size-5 text-steel" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] text-muted-foreground">Right now</p>
                  <p className="truncate text-[0.9rem] text-foreground">{task.title}</p>
                  <p className="truncate text-[0.7rem] text-muted-foreground">{task.detail}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2.5 px-2.5 pb-2.5">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="block h-full rounded-full"
                  style={{
                    background: ready
                      ? "var(--teal)"
                      : "linear-gradient(90deg, var(--amber), var(--teal))",
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={
                    reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20 }
                  }
                />
              </span>
              <span className="readout shrink-0 text-[0.68rem] text-foreground">{progress}%</span>
            </div>
          </div>

          {/* ---- Readouts ---- */}
          <dl className="hairline-t mt-3.5 grid grid-cols-3 gap-2 pt-3">
            {[
              ["Stage", `${String(stage + 1).padStart(2, "0")}/${BOOKING_STAGES.length}`],
              ["On the job", clock],
              ["Estimate", stage >= 4 ? "PKR 18,400" : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.66rem] text-muted-foreground">{label}</dt>
                <dd className="readout mt-0.5 truncate text-[0.8rem] text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </motion.div>
    </div>
  );
}
