import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BayStage } from "@/components/marketing/bay-stage";
import { JobCard } from "@/components/marketing/job-card";
import { LiveJobProvider } from "@/components/marketing/live-job";

/**
 * Signing in is arriving at the shop, so the left half *is* the shop: the same
 * lit WebGL bay the public site opens with, and the same job card travelling the
 * same ten stages. Someone sees the product working before they have an account.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <aside className="relative isolate hidden w-[48%] flex-col justify-between overflow-hidden border-r border-line p-8 lg:flex xl:p-12">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-ink" aria-hidden />
        <BayStage className="pointer-events-none absolute inset-0 -z-10 size-full" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-ink/75 via-ink/30 to-ink/15"
          aria-hidden
        />

        <Link href="/" aria-label="BayFlow home" className="relative w-fit">
          <Logo />
        </Link>

        <div className="relative">
          <h2 className="display text-[clamp(1.7rem,2.5vw,2.4rem)] text-foreground">
            <span className="display-shutter block">The whole shop floor,</span>
            <span className="display-shutter block" style={{ animationDelay: "0.12s" }}>
              on one board.
            </span>
          </h2>
          <div className="mt-8 max-w-sm xl:mt-10">
            <LiveJobProvider>
              <JobCard />
            </LiveJobProvider>
          </div>
        </div>

        <p className="readout relative text-xs text-muted-foreground/70">
          BayFlow — built for LoopVerse 3.0
        </p>
      </aside>

      {/* overflow-hidden matters: `.bay-floor` is scaled 2.4x to sit in
          perspective, so it needs a parent to clip it or it widens the page. */}
      <div className="relative flex w-full flex-1 flex-col overflow-hidden">
        {/* On a phone there is no bay panel, so the floor runs under the form. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bay-floor opacity-40 lg:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 work-light opacity-40"
          aria-hidden
        />

        <header className="flex items-center justify-between gap-4 px-6 py-5">
          <Link href="/" aria-label="BayFlow home" className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="group inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Back to home
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pt-4 pb-14">{children}</main>
      </div>
    </div>
  );
}
