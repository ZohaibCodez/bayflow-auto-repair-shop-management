"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  CalendarCheck,
  ClipboardCheck,
  Search,
  FileCheck2,
  Wrench,
  ShieldCheck,
  CarFront,
} from "lucide-react";
import { LIFECYCLE } from "@/lib/booking/statuses";
import { IMAGES } from "@/lib/images";
import { FallbackImage } from "@/components/fallback-image";

const STEP_ICONS = [
  CalendarCheck,
  ClipboardCheck,
  Search,
  FileCheck2,
  Wrench,
  ShieldCheck,
  CarFront,
];

function StepCard({
  step,
  index,
  imageSrc,
}: {
  step: (typeof LIFECYCLE)[number];
  index: number;
  imageSrc: string | undefined;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const isLast = index === LIFECYCLE.length - 1;
  const isEven = index % 2 === 0;
  const Icon = STEP_ICONS[index] ?? CalendarCheck;

  return (
    <li ref={ref} className="relative grid gap-6 md:grid-cols-2 md:gap-10">
      {/* ---- Vertical timeline rail (centre on md+) ---- */}
      <div className="pointer-events-none absolute inset-y-0 left-[19px] z-10 md:left-1/2 md:-translate-x-1/2">
        {/* glowing node */}
        <span
          className={`absolute top-6 -translate-x-1/2 left-1/2 z-20 grid size-10 place-items-center rounded-full border-2 backdrop-blur-sm transition-all duration-700 ${
            isLast
              ? "border-teal/60 bg-teal/15 shadow-[0_0_20px_rgba(45,212,191,0.25)]"
              : "border-amber/60 bg-amber/15 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          } ${inView ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
        >
          <Icon
            className={`size-4 ${isLast ? "text-teal" : "text-amber"}`}
          />
        </span>
        {/* connecting line */}
        {!isLast && (
          <span
            className="absolute left-1/2 top-16 bottom-0 w-px -translate-x-1/2"
            style={{
              background: `linear-gradient(to bottom, ${
                isLast ? "var(--teal)" : "var(--amber)"
              } 0%, color-mix(in oklab, var(--line) 60%, transparent) 100%)`,
            }}
          />
        )}
      </div>

      {/* ---- Content card ---- */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className={`group relative overflow-hidden rounded-2xl border border-line/80 bg-surface/60 p-6 shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-500 hover:border-amber/30 hover:shadow-amber/5 sm:p-8 ${
          isEven ? "md:col-start-1" : "md:col-start-2"
        }`}
      >
        {/* ambient glow */}
        <div
          className={`pointer-events-none absolute -top-20 ${
            isEven ? "-right-20" : "-left-20"
          } size-40 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-60 ${
            isLast ? "bg-teal/10 opacity-25" : "bg-amber/10 opacity-25"
          }`}
          aria-hidden
        />

        {/* step number + label row */}
        <div className="relative flex items-start gap-4">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
              isLast
                ? "bg-teal/15 text-teal"
                : "bg-amber/15 text-amber"
            }`}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-display-md text-lg text-foreground sm:text-xl">
              {step.label}
            </h3>
            <span
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase ${
                isLast
                  ? "border-teal/30 bg-teal/8 text-teal"
                  : "border-amber/30 bg-amber/8 text-amber"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isLast ? "bg-teal" : "bg-amber"
                }`}
              />
              {step.owner}
            </span>
          </div>
        </div>

        <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {step.blurb}
        </p>

        {/* image */}
        {imageSrc && (
          <div className="relative mt-5 overflow-hidden rounded-xl border border-line/60">
            <FallbackImage
              src={imageSrc}
              alt=""
              className="aspect-[3/2] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
          </div>
        )}
      </motion.div>

      {/* ---- Empty grid cell on alternate side ---- */}
      {isEven ? (
        <div className="hidden md:block" aria-hidden />
      ) : (
        <div className="order-first hidden md:block" aria-hidden />
      )}
    </li>
  );
}

export function Lifecycle() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-40px" });

  return (
    <section id="how" className="relative overflow-hidden border-t border-line/60 bg-ink">
      {/* subtle radial decoration */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 size-[800px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--amber) 12%, transparent), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
        {/* header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3.5 py-1 text-xs font-medium tracking-wide text-amber uppercase">
            <span className="size-1.5 rounded-full bg-amber animate-pulse" />
            7-step pipeline
          </span>
          <h2 className="mt-5 font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
            How a repair flows
          </h2>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            Every job moves through the same fixed set of steps. Each step has one
            responsible person, and nothing skips ahead&nbsp;— so the car&rsquo;s
            status is never a guess.
          </p>
        </motion.div>

        {/* timeline */}
        <ol className="relative mt-16 space-y-8 pl-10 md:space-y-12 md:pl-0">
          {LIFECYCLE.map((step, i) => (
            <StepCard
              key={step.label}
              step={step}
              index={i}
              imageSrc={IMAGES.lifecycle[i]}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
