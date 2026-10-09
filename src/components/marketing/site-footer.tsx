import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            One platform for the whole shop floor — and for the customer waiting
            on the car.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <ThemeToggle />
          <Link href="/#shops" className="hover:text-foreground">
            Find a shop
          </Link>
          <Link href="/#how" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            For shop owners
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
      <div className="border-t border-line/50">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground/70 sm:px-6">
          BayFlow — built for LoopVerse 3.0. A demo platform for independent auto
          repair shops.
        </p>
      </div>
    </footer>
  );
}
