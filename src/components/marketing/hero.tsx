import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  PlayCircle,
  Radio,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloorRail } from "@/components/marketing/floor-rail";
import { HeroVideo } from "@/components/marketing/hero-video";
import { JobCard } from "@/components/marketing/job-card";
import { LiveJobProvider } from "@/components/marketing/live-job";
import { IMAGES, photoBackground } from "@/lib/images";

/**
 * The hero is a server component: the headline is plain HTML animated by CSS,
 * so it paints with the document instead of waiting for hydration. Only the
 * floor rail and the job card need the client.
 *
 * The backdrop is footage of a car in a lit workshop (`IMAGES.heroVideo`),
 * muted and looping. Under it sits the workshop photograph (`IMAGES.hero`),
 * which is what shows until the video is playing — and for good if it never
 * plays or the visitor asks for reduced motion. `photoBackground` falls back
 * to a painted gradient beneath that.
 */

/** Painted when the hero photograph isn't there. */
const BACKDROP =
  "radial-gradient(120% 90% at 78% 35%, color-mix(in oklab, var(--amber) 18%, transparent), transparent 60%), " +
  "radial-gradient(90% 70% at 95% 85%, color-mix(in oklab, var(--teal) 14%, transparent), transparent 65%), " +
  "linear-gradient(160deg, var(--surface), var(--ink) 70%)";

const TRUST = [
  { icon: BadgeCheck, title: "Verified shops", detail: "Listed once staffed" },
  { icon: Radio, title: "Live tracking", detail: "Every stage, as it happens" },
  { icon: Receipt, title: "Itemised estimates", detail: "You approve first" },
];

export function Hero({ shopCount }: { shopCount: number }) {
  return (
    <section className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* ---- Backdrop ----------------------------------------------------
          Photo, then scrims: one across to hold the copy column, one up from
          the floor so the route strip and bottom line have ground to sit on. */}
      <div className="pointer-events-none absolute inset-0 -z-30 bg-ink" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={photoBackground(IMAGES.hero, BACKDROP)}
        aria-hidden
      />
      {/* Fades in over the photo only once it is really playing. */}
      <HeroVideo
        src={IMAGES.heroVideo}
        className="pointer-events-none absolute inset-0 -z-20 size-full"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/80 to-ink/25 lg:via-ink/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-ink via-ink/85 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-ink/90 to-transparent"
        aria-hidden
      />

      <LiveJobProvider>
        <div className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-28 pb-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:pt-32">
          <div>
            <p
              className="flex items-center gap-2.5 text-xs tracking-[0.14em] text-steel uppercase opacity-0"
              style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .1s forwards" }}
            >
              <span className="pulse-dot size-1.5 rounded-full bg-teal text-teal" />
              {shopCount} {shopCount === 1 ? "shop" : "shops"} taking bookings right now
            </p>

            <h1 className="mt-5 text-[clamp(2.5rem,5.4vw,4.4rem)] text-foreground">
              {/* Archivo carries a width axis, so each line opens from condensed
                to expanded — a shutter going up. */}
              <span className="display display-shutter block">See your car</span>
              <span className="display display-shutter block" style={{ animationDelay: "0.1s" }}>
                move through
              </span>
              <span
                className="display display-shutter text-live block"
                style={{ animationDelay: "0.2s" }}
              >
                the shop.
                <span className="caret" aria-hidden />
              </span>
            </h1>

            <p
              className="mt-7 max-w-[46ch] text-lg leading-relaxed text-muted-foreground opacity-0"
              style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .5s forwards" }}
            >
              Pick a repair shop, approve the estimate from your phone, and watch the job cross
              every bay. No more ringing up to ask whether it&rsquo;s ready.
            </p>

            <div
              className="mt-8 flex flex-wrap items-center gap-3 opacity-0"
              style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .6s forwards" }}
            >
              <Button
                render={<Link href="/#shops" />}
                size="lg"
                className="sheen group h-12 rounded-full px-6 text-[0.95rem] shadow-lg shadow-amber/25 transition-transform hover:-translate-y-0.5"
              >
                <CalendarDays className="size-4" />
                Book a service
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
              <Button
                render={<Link href="/#how" />}
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-line bg-surface/50 px-6 text-[0.95rem] backdrop-blur-md transition-transform hover:-translate-y-0.5"
              >
                <PlayCircle className="size-4" />
                See how it works
              </Button>
            </div>

            <ul
              className="mt-9 grid max-w-xl gap-x-5 gap-y-4 opacity-0 sm:grid-cols-3"
              style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .72s forwards" }}
            >
              {TRUST.map(({ icon: Icon, title, detail }) => (
                <li key={title} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-teal-ink" />
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">{title}</span>
                    <span className="block text-xs text-muted-foreground">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* The card is set down last, and from depth. */}
          <div
            className="w-full opacity-0"
            style={{ animation: "card-in 1s cubic-bezier(.16,1,.3,1) .55s forwards" }}
          >
            <JobCard />
          </div>
        </div>

        {/* ---- The same job, running along the floor ----------------------- */}
        <div
          className="relative mx-auto hidden w-full max-w-6xl px-4 pb-8 opacity-0 sm:block sm:px-6"
          style={{ animation: "hero-in .9s cubic-bezier(.16,1,.3,1) .85s forwards" }}
        >
          <FloorRail />
        </div>
      </LiveJobProvider>

      {/* ---- Floor line --------------------------------------------------- */}
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pb-6 sm:px-6">
        <p className="hidden text-xs text-muted-foreground sm:block">
          BayFlow <span className="text-muted-foreground/40">·</span> book it, track it, drive it
        </p>
        <Link
          href="/#shops"
          className="group mx-auto flex items-center gap-2 rounded-full border border-line/70 bg-surface/50 px-4 py-2 text-xs text-muted-foreground backdrop-blur-md transition-colors hover:border-teal/40 hover:text-foreground sm:mx-0"
        >
          Find a shop near you
          <ArrowDown className="size-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
        </Link>
        <p className="readout hidden text-xs text-muted-foreground/70 sm:block">
          Lahore &middot; Karachi &middot; Islamabad
        </p>
      </div>
    </section>
  );
}
