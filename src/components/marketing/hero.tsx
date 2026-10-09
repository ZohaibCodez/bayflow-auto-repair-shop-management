"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Pipeline } from "@/components/marketing/pipeline";
import { IMAGES, photoBackground } from "@/lib/images";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero({ shopCount }: { shopCount: number }) {
  const reduce = useReducedMotion();

  const rise = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.6, ease: EASE },
        };

  return (
    <section className="relative overflow-hidden">
      {/* Optional hero photo (public/images/hero-bay.webp) — faded into the page so the
          headline stays readable in both themes. Without the file nothing changes. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={photoBackground(IMAGES.hero, "none")}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/25"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bay-grid" aria-hidden />
      <div className="pointer-events-none absolute inset-0 amber-glow" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-32 pb-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-40 lg:pb-28">
        <div>
          <motion.h1
            {...rise(0.05)}
            className="font-display text-5xl text-foreground sm:text-6xl lg:text-7xl"
          >
            See your car move
            <br />
            through the shop.
          </motion.h1>

          <motion.p
            {...rise(0.18)}
            className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground"
          >
            Book a trusted repair shop, approve the estimate from your phone, and
            follow every step from check-in to pick-up. No more calling to ask if
            it&rsquo;s ready.
          </motion.p>

          <motion.div {...rise(0.3)} className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              render={<Link href="/#shops" />}
              size="lg"
              className="h-11 px-6 text-[0.95rem]"
            >
              Book a service
            </Button>
            <Button
              render={<Link href="/signup" />}
              size="lg"
              variant="outline"
              className="h-11 px-6 text-[0.95rem]"
            >
              Run a shop? Start free
            </Button>
          </motion.div>

          <motion.p {...rise(0.42)} className="mt-6 text-sm text-muted-foreground/80">
            <span className="font-mono text-foreground">{shopCount}</span> shops live
            now · demo accounts ready for judges
          </motion.p>
        </div>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.7, ease: EASE }}
        >
          <Pipeline />
        </motion.div>
      </div>
    </section>
  );
}
