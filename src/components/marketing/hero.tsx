import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BayStage } from "@/components/marketing/bay-stage";
import { JobCard } from "@/components/marketing/job-card";

/**
 * The hero is a server component: the headline is plain HTML animated by CSS, so
 * it paints with the document instead of waiting for hydration. Only the lit
 * stage behind it and the job card beside it need the client.
 *
 * The load sequence runs once, in one direction — floor, headline, lede, card.
 */
export function Hero({ shopCount }: { shopCount: number }) {
  return (
    <section className="grain relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden">
      {/* ---- The bay ----------------------------------------------------
          Three layers: the CSS floor (always there, and the fallback when
          WebGL is unavailable), the lit WebGL stage over it, then a scrim so
          the copy column keeps its contrast whatever the floor is doing. */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-ink" aria-hidden>
        <div className="absolute inset-x-0 bottom-0 top-1/3 bay-floor opacity-70" />
      </div>
      <BayStage className="pointer-events-none absolute inset-0 -z-10 size-full" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/82 to-transparent lg:via-ink/55"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-ink to-transparent"
        aria-hidden
      />

      {/* The headline takes the full measure of the page — it is the loudest
          thing here, so nothing shares its line. Everything else sits beneath
          it in two columns. */}
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-28 pb-24 sm:px-6 lg:pt-32">
        <p
          className="flex items-center gap-2.5 text-sm text-steel opacity-0"
          style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .1s forwards" }}
        >
          <span className="pulse-dot size-1.5 rounded-full bg-teal text-teal" />
          {shopCount} {shopCount === 1 ? "shop" : "shops"} taking bookings right now
        </p>

        <h1 className="mt-5 text-[clamp(2.6rem,7.2vw,5.75rem)] text-foreground">
          {/* Archivo is loaded with its width axis, so each line opens from
              condensed to expanded — like a shutter going up. */}
          <span className="display display-shutter block">See your car move</span>
          <span className="display display-shutter block" style={{ animationDelay: "0.13s" }}>
            through the shop.
          </span>
        </h1>

        <div className="mt-11 grid items-center gap-12 lg:mt-14 lg:grid-cols-[1fr_0.84fr] lg:gap-16">
          <div>
            <p
              className="max-w-[46ch] text-lg leading-relaxed text-muted-foreground opacity-0"
              style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .42s forwards" }}
            >
              Pick a repair shop, approve the estimate from your phone, and watch the job cross
              every bay. No more ringing up to ask whether it&rsquo;s ready.
            </p>

            <div
              className="mt-8 flex flex-wrap items-center gap-3 opacity-0"
              style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .54s forwards" }}
            >
              <Button
                render={<Link href="/#shops" />}
                size="lg"
                className="sheen h-12 rounded-xl px-7 text-[0.95rem] shadow-lg shadow-amber/20 transition-transform hover:-translate-y-0.5"
              >
                Book a service
              </Button>
              <Button
                render={<Link href="/signup" />}
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-line bg-surface/60 px-7 text-[0.95rem] backdrop-blur-md transition-transform hover:-translate-y-0.5"
              >
                Run a shop
              </Button>
            </div>

            <p
              className="mt-7 max-w-[44ch] text-sm leading-relaxed text-muted-foreground opacity-0"
              style={{ animation: "hero-in .8s cubic-bezier(.16,1,.3,1) .66s forwards" }}
            >
              Demo accounts are seeded for every role — owner, service advisor, technician, parts
              and QC.{" "}
              <Link
                href="/login"
                className="text-amber-ink underline decoration-amber/40 underline-offset-4 hover:decoration-amber"
              >
                Sign in to look around
              </Link>
              .
            </p>
          </div>

          {/* The card arrives last and from depth, as though set down on the floor. */}
          <div
            className="opacity-0"
            style={{ animation: "card-in 1s cubic-bezier(.16,1,.3,1) .5s forwards" }}
          >
            <JobCard />
          </div>
        </div>
      </div>

      <Link
        href="/#shops"
        aria-label="Skip to the shop directory"
        className="group absolute inset-x-0 bottom-6 mx-auto hidden w-fit items-center gap-2 rounded-full border border-line/70 bg-surface/50 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-md transition-colors hover:border-amber/40 hover:text-foreground sm:flex"
      >
        Find a shop near you
        <ArrowDown className="size-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
      </Link>
    </section>
  );
}
