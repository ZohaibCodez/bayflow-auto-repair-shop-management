"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FallbackImage } from "@/components/fallback-image";
import { IMAGES } from "@/lib/images";
import { trackPointer } from "@/lib/pointer";

/** The one thing a shop owner needs to believe: it's their whole floor, not a form. */
const INCLUDED = [
  "Bookings, estimates, parts and quality checks on one board",
  "Your team added by role, with their own screens",
  "More than one shop under one login, kept apart",
];

export function OwnerCta() {
  return (
    <section id="owners" className="relative border-t border-line/60 bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div
          onPointerMove={trackPointer}
          className="edge-glow relative overflow-hidden rounded-3xl border border-line bg-surface"
        >
          {/* The work lamp, pooling in the top-left of the panel. */}
          <div className="pointer-events-none absolute inset-0 work-light opacity-70" aria-hidden />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 bay-floor opacity-30"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block"
            aria-hidden
          >
            <FallbackImage
              src={IMAGES.ownerCta}
              alt=""
              className="h-full w-full object-cover"
              fallback={null}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/55 to-transparent" />
          </div>

          <div className="relative max-w-xl p-8 sm:p-12 lg:p-14">
            <h2 className="display text-[clamp(2rem,4.4vw,3rem)] text-foreground">
              Put your whole shop on one board
            </h2>
            <p className="mt-5 text-muted-foreground">
              Create the shop, add the people who work there, and every car that comes in has a
              place, a holder and a next step.
            </p>

            <ul className="mt-8 space-y-3">
              {INCLUDED.map((line) => (
                <li key={line} className="flex gap-3 text-[0.95rem] text-foreground">
                  <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0" aria-hidden>
                    <path
                      d="M3 8.5 6.2 11.6 13 4.8"
                      fill="none"
                      stroke="var(--amber)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button
                render={<Link href="/signup" />}
                size="lg"
                className="sheen h-12 rounded-xl px-7 shadow-lg shadow-amber/20 transition-transform hover:-translate-y-0.5"
              >
                Create your shop
              </Button>
              <Button
                render={<Link href="/login" />}
                size="lg"
                variant="outline"
                className="h-12 rounded-xl px-7"
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
