import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/theme/theme-toggle";
import { ShopCity } from "@/components/auth/shop-city";
import { JobCard } from "@/components/marketing/job-card";
import { LiveJobProvider } from "@/components/marketing/live-job";

/**
 * Signing in is arriving at the shop, so the left half *is* the shop: the
 * workshop on its corner at night, traffic moving past, and the same job card
 * travelling the same ten stages. Someone sees the product working before they
 * have an account.
 *
 * On a desktop the whole screen is one viewport — nothing scrolls. Short
 * screens tighten (see the `short` / `shorter` variants) rather than overflow.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <aside className="scene-dark relative isolate hidden w-[48%] flex-col overflow-hidden border-r border-line px-10 py-7 lg:flex xl:px-16 short:py-5">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-ink" aria-hidden />
        <ShopCity className="pointer-events-none absolute inset-0 -z-10 size-full" />

        <Link href="/" aria-label="BayFlow home" className="relative w-fit">
          <Logo />
        </Link>

        <div className="relative mt-[clamp(1.25rem,5vh,3.5rem)]">
          <span aria-hidden className="block h-[3px] w-9 rounded-full bg-teal" />
          <h2 className="display mt-4 text-[clamp(1.7rem,2.5vw,2.6rem)] leading-[1.05] text-foreground">
            <span className="display-shutter block">The whole shop floor.</span>
            <span className="display-shutter block" style={{ animationDelay: "0.12s" }}>
              On one board<span className="text-teal">.</span>
            </span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground shorter:hidden">
            One login. A live view of every job, every bay, every handoff.
          </p>
        </div>

        {/* zoom, not a smaller layout: the card should read the same, just smaller */}
        <div className="relative mt-[clamp(1rem,3.5vh,2.25rem)] w-full max-w-[26rem] short:[zoom:0.9] shorter:[zoom:0.78]">
          <LiveJobProvider>
            <JobCard />
          </LiveJobProvider>
        </div>

        <p className="relative mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
          <span aria-hidden className="h-px w-8 bg-teal" />
          BayFlow — built for modern repair teams.
        </p>
      </aside>

      {/* overflow-hidden matters on a phone: `.bay-floor` is scaled 2.4x to sit
          in perspective, so it needs a parent to clip it. On a desktop the
          column may scroll only as a last resort on a very short window. */}
      <div className="relative flex w-full flex-1 flex-col overflow-hidden lg:overflow-y-auto">
        {/* On a phone there is no city panel, so the floor runs under the form. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bay-floor opacity-40 lg:hidden"
          aria-hidden
        />

        <header className="flex items-center justify-between gap-4 px-6 py-4 lg:px-10 lg:pt-6 short:lg:pt-4">
          <Link href="/" aria-label="BayFlow home" className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeSwitch />
            <Link
              href="/"
              className="group inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Back to home
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-8 lg:px-16 short:pb-5">
          {children}
        </main>
      </div>
    </div>
  );
}
