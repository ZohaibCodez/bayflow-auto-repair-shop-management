"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Check, ClipboardCheck, KeyRound, Wrench, type LucideIcon } from "lucide-react";
import { BOOKING_STAGES } from "@/lib/booking/statuses";

export const LAST_STAGE = BOOKING_STAGES.length - 1;
/** How long the demo job spends on each of the ten stages. */
const DWELL = 2600;

/**
 * The four milestones a customer actually talks about. The ten lifecycle
 * stages map onto them, so a stepper stays readable while the detail beneath
 * still says exactly where the car is.
 */
export const MILESTONES: { label: string; icon: LucideIcon; upto: number; at: string | null }[] = [
  { label: "Booked", icon: Check, upto: 1, at: "08:12" },
  { label: "In service", icon: Wrench, upto: 7, at: "10:24" },
  { label: "Quality check", icon: ClipboardCheck, upto: 8, at: null },
  { label: "Ready", icon: KeyRound, upto: 9, at: null },
];

export const milestoneFor = (stage: number) => MILESTONES.findIndex((m) => stage <= m.upto);

type LiveJob = { stage: number; elapsed: number };

const LiveJobContext = createContext<LiveJob | null>(null);

/**
 * One demo job, shared. The hero shows it twice — as the card on the right and
 * as the rail along the floor — and the two must never disagree, so the clock
 * lives here rather than in either of them.
 */
export function LiveJobProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(reduce ? LAST_STAGE : 0);
  const [elapsed, setElapsed] = useState(2 * 3600 + 14 * 60 + 32);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStage((i) => (i >= LAST_STAGE ? 0 : i + 1)), DWELL);
    return () => clearInterval(id);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [reduce]);

  return <LiveJobContext value={{ stage, elapsed }}>{children}</LiveJobContext>;
}

export function useLiveJob(): LiveJob {
  const value = useContext(LiveJobContext);
  if (!value) throw new Error("useLiveJob must be used inside <LiveJobProvider>");
  return value;
}
