"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const REEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * One digit on a reel. The strip is twice as tall as the numbers it shows, so
 * every digit spins a full revolution before it lands — a mileage counter
 * rolling over, which is the one counter every driver already knows.
 *
 * Shared by the landing page's instrument strip and the POS overview, so the
 * "instrument" feel of a live number is identical everywhere BayFlow shows one.
 */
function Reel({ digit, order, active }: { digit: number; order: number; active: boolean }) {
  const reduce = useReducedMotion();
  const pos = useMotionValue(reduce ? 10 + digit : 0);
  // 20 cells tall, so one cell is 5% of the strip.
  const y = useTransform(pos, (v) => `${-v * 5}%`);

  useEffect(() => {
    if (!active || reduce) return;
    const controls = animate(pos, 10 + digit, {
      duration: 0.75 + order * 0.14, // digits to the left settle first
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [active, digit, order, pos, reduce]);

  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden align-bottom">
      <motion.span className="absolute inset-x-0 top-0 flex flex-col" style={{ y }}>
        {REEL.map((n, i) => (
          <span key={i} className="h-[1em] leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** A small whole number (0–999-ish) as a set of rolling odometer digits. */
export function Odometer({ value, active = true }: { value: number; active?: boolean }) {
  const digits = [...String(Math.max(0, Math.round(value)))];
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="readout inline-flex leading-none">
        {digits.map((d, i) => (
          <Reel key={i} digit={Number(d)} order={i} active={active} />
        ))}
      </span>
    </>
  );
}

/**
 * A formatted value (currency, a percentage, a decimal with a unit) that counts
 * up from zero to `value` once, then settles on the exact same string `format`
 * would produce statically — so with JS disabled, reduced motion, or after the
 * animation ends, the number is never anything but correct.
 */
export function CountUp({
  value,
  format,
  active = true,
  durationMs = 900,
}: {
  value: number;
  format: (n: number) => string;
  active?: boolean;
  durationMs?: number;
}) {
  const reduce = useReducedMotion();
  const [label, setLabel] = useState(() => format(reduce || !active ? value : 0));
  const started = useRef(false);

  useEffect(() => {
    if (!active || reduce || started.current) return;
    started.current = true;
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setLabel(format(v)),
    });
    return () => controls.stop();
  }, [active, durationMs, format, reduce, value]);

  return <span className="tabular">{label}</span>;
}
