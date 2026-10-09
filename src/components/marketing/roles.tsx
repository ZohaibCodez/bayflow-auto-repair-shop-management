"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ClipboardList, Package, ShieldCheck, Wrench } from "lucide-react";
import { trackPointer } from "@/lib/pointer";

/** How long each role holds the panel before it hands over. */
const DWELL = 5000;

/**
 * Four roles, one floor. The point of this section is that a role isn't a
 * permission label — it changes what the screen *contains*. So picking a role
 * swaps a real list of that person's own work, rather than describing it.
 */
const ROLES = [
  {
    key: "advisor",
    name: "Service advisor",
    icon: ClipboardList,
    holds: "Owns the customer conversation",
    sees: [
      "Today's arrivals, confirmed or waiting",
      "Estimates to send, and the replies that came back",
      "Cars ready — and who still has to be called",
    ],
  },
  {
    key: "tech",
    name: "Technician",
    icon: Wrench,
    holds: "Owns the car in the bay",
    sees: [
      "Only the jobs assigned to them",
      "The problems the customer described, in their words",
      "Inspection notes and the parts each repair needs",
    ],
  },
  {
    key: "parts",
    name: "Parts",
    icon: Package,
    holds: "Owns what's on the shelf",
    sees: [
      "Shortages worked out from approved estimates",
      "Stock reserved against a specific job",
      "Purchase orders, and what's arrived against them",
    ],
  },
  {
    key: "qc",
    name: "Quality check",
    icon: ShieldCheck,
    holds: "Owns the sign-off",
    sees: [
      "The queue of cars waiting on a second pair of eyes",
      "A claim button, so two inspectors can't take one car",
      "Fail it, and the job goes back to the bay with the reason",
    ],
  },
] as const;

export function Roles() {
  const [active, setActive] = useState(0);
  // Set once someone picks a role themselves: the shop floor stops handing over
  // on its own, because they are now reading rather than being shown.
  const [taken, setTaken] = useState(false);
  const [hovering, setHovering] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-25% 0px -25% 0px" });
  const role = ROLES[active];

  // Hand the floor to the next role, but only while this section is actually
  // on screen and nobody is interacting with it.
  const running = inView && !taken && !hovering && !reduce;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setActive((i) => (i + 1) % ROLES.length), DWELL);
    return () => clearInterval(id);
  }, [running]);

  function pick(i: number) {
    setActive(i);
    setTaken(true);
  }

  return (
    <section ref={ref} className="relative border-t border-line/60 bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="display text-[clamp(2rem,4.6vw,3.25rem)] text-foreground">
            One floor, four jobs
          </h2>
          <p className="mt-4 max-w-[52ch] text-muted-foreground">
            Everyone signs in to the same shop, and everyone gets a different screen. A technician
            never sees another technician&rsquo;s cars; a QC inspector can&rsquo;t sign off their
            own repair.
          </p>
        </div>

        <div
          className="mt-12 grid gap-4 lg:grid-cols-[22rem_1fr] lg:gap-8"
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          onFocusCapture={() => setHovering(true)}
          onBlurCapture={() => setHovering(false)}
        >
          {/* ---- Role picker ---- */}
          <div role="tablist" aria-label="Shop roles" className="flex flex-col gap-2">
            {ROLES.map((r, i) => {
              const selected = i === active;
              const Icon = r.icon;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  id={`${panelId}-tab-${r.key}`}
                  aria-selected={selected}
                  aria-controls={panelId}
                  onClick={() => pick(i)}
                  onPointerMove={trackPointer}
                  className={`spotlight group relative flex items-center gap-3.5 overflow-hidden rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? "border-amber/45 bg-surface"
                      : "border-line/70 bg-surface/40 hover:border-line hover:bg-surface/70"
                  }`}
                >
                  {/* The lit edge marks who holds the floor right now. */}
                  {selected && (
                    <motion.span
                      layoutId={reduce ? undefined : `${panelId}-marker`}
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  {/* How long this role holds the panel. It drains only while
                      the hand-over is actually running, so a paused section
                      doesn't promise a change that isn't coming. */}
                  {selected && running && (
                    <motion.span
                      key={`timer-${active}`}
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-px origin-left bg-amber/55"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: DWELL / 1000, ease: "linear" }}
                    />
                  )}
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
                      selected ? "bg-amber/15 text-amber-ink" : "bg-surface-2 text-steel"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.95rem] text-foreground">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.holds}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ---- What that person sees ---- */}
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${panelId}-tab-${role.key}`}
            className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-9"
          >
            <div
              className="pointer-events-none absolute inset-0 work-light opacity-45"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 bay-floor opacity-25"
              aria-hidden
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={role.key}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 18, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -18, filter: "blur(6px)" }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <p className="text-sm text-muted-foreground">
                  Signed in as a {role.name.toLowerCase()}, the board shows
                </p>
                {/* Not numbered: these are three things on one screen, not
                    three steps in an order. A rule between them is enough. */}
                <ul className="mt-6">
                  {role.sees.map((line, i) => (
                    <motion.li
                      key={line}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: reduce ? 0 : 0.08 + i * 0.07,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="py-4 text-[1.05rem] leading-snug text-foreground not-last:border-b not-last:border-line/60 sm:text-xl"
                    >
                      {line}
                    </motion.li>
                  ))}
                </ul>
                <p className="hairline-t mt-8 pt-5 text-sm text-steel">
                  Every one of those lists is filtered on the server. Changing the shop in the URL
                  returns a 403, not someone else&rsquo;s cars.
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
