import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

/** Where each seeded account lands after signing in. */
const DEMO_ROLES = [
  ["Owner", "Every shop you own, and the team in each"],
  ["Service advisor", "Today's arrivals and the estimates waiting"],
  ["Technician", "Only the cars in your bay"],
  ["Parts", "Shortages, reservations and purchase orders"],
  ["QC inspector", "The queue waiting on a sign-off"],
];

const COLUMNS = [
  {
    heading: "Customers",
    links: [
      { href: "/#shops", label: "Find a shop" },
      { href: "/#how", label: "How a repair flows" },
      { href: "/account", label: "Your bookings" },
    ],
  },
  {
    heading: "Shops",
    links: [
      { href: "/signup", label: "Create a shop" },
      { href: "/#owners", label: "What you get" },
      { href: "/pos", label: "Shop floor" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-line/70 bg-ink">
      {/* The bay floor runs out under the footer and the wordmark sits on it. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%] bay-floor opacity-40"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---- Look around -------------------------------------------------
            The page ends on the most useful thing a stranger can do next:
            sign in as somebody and see the floor from their seat. */}
        <div className="grid gap-10 py-16 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-20">
          <div>
            <h2 className="display text-[clamp(1.75rem,3.6vw,2.5rem)] text-foreground">
              Look around as anyone
            </h2>
            <p className="mt-4 max-w-[42ch] text-muted-foreground">
              Every role on the floor has a seeded account, and each one signs in to a different
              board. Sign-in details are in the project README.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                render={<Link href="/login" />}
                className="sheen h-11 rounded-xl px-6 transition-transform hover:-translate-y-0.5"
              >
                Sign in
              </Button>
              <Button
                render={<Link href="/#shops" />}
                variant="outline"
                className="h-11 rounded-xl px-6"
              >
                Find a shop
              </Button>
            </div>
          </div>

          <dl className="self-center">
            {DEMO_ROLES.map(([role, lands]) => (
              <div
                key={role}
                className="flex flex-col gap-0.5 border-b border-line/60 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <dt className="w-40 shrink-0 text-sm text-foreground">{role}</dt>
                <dd className="text-sm text-muted-foreground">{lands}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ---- Sitemap ---- */}
        <div className="flex flex-col gap-10 border-t border-line/60 py-12 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              One board for the whole shop floor, and a straight answer for the person waiting on
              the car.
            </p>
            <ThemeToggle className="mt-6" />
          </div>

          <div className="flex gap-12 sm:gap-16">
            {COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h3 className="text-sm text-foreground">{col.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/60 py-6">
          <p className="text-xs text-muted-foreground/70">
            BayFlow — built for LoopVerse 3.0. A demo platform for independent auto repair shops.
          </p>
          <Link
            href="#top"
            className="group inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground"
          >
            Back to the top
            <ArrowUp className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      {/* ---- The wordmark, painted on the bay floor ----------------------
          Faded upward with background-clip rather than a flat opacity, so it
          reads as paint worn off the concrete, and the same lamp that crosses
          the hero passes over it once in a while. */}
      <div className="relative mx-auto max-w-6xl px-4 pb-5 sm:px-6 sm:pb-7" aria-hidden>
        <p className="wordmark display relative select-none text-center text-[clamp(3rem,13.2vw,10rem)] leading-[0.95]">
          <span className="wordmark-base">BayFlow</span>
          <span className="wordmark-sweep absolute inset-0">BayFlow</span>
        </p>
      </div>
    </footer>
  );
}
