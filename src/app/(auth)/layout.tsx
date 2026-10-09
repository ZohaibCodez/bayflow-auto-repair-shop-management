import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      {/* Brand panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-line bg-ink p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bay-grid" aria-hidden />
        <div className="pointer-events-none absolute inset-0 amber-glow" aria-hidden />
        <Link href="/" className="relative">
          <Logo />
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl leading-[1.05] text-foreground">
            The whole shop floor,
            <br />
            on one board.
          </h2>
          <p className="mt-5 max-w-sm text-muted-foreground">
            Bookings, estimates, parts and quality checks — every job with one owner
            and a status nobody has to guess.
          </p>
        </div>
        <p className="relative font-mono text-xs text-muted-foreground/70">
          BayFlow · LoopVerse 3.0
        </p>
      </aside>

      {/* Form side */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-5 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to home
            </Link>
          </div>
        </div>
        <main className="grid flex-1 place-items-center px-6 py-12">{children}</main>
      </div>
    </div>
  );
}
