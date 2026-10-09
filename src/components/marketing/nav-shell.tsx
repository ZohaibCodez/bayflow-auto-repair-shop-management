"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#shops", label: "Find a shop", section: "shops" },
  { href: "/#how", label: "How it works", section: "how" },
  { href: "/#owners", label: "For shop owners", section: "owners" },
];

/**
 * The marketing header. Three things change with the page rather than on a
 * timer, so each one tells you where you are: the bar gains its edge once you
 * leave the hero, the underline tracks the section you're reading, and the
 * hairline at the foot reports how far down the page you've come.
 */
export function NavShell({ authSlot }: { authSlot: ReactNode }) {
  const [lifted, setLifted] = useState(false);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const headPosition = useMotionTemplate`${useTransform(scrollYProgress, [0, 1], [0, 100])}%`;

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Which section is under the top third of the viewport.
  useEffect(() => {
    const targets = LINKS.map((l) => document.getElementById(l.section)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setSection(hit.target.id);
        else if (window.scrollY < 200) setSection(null);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.2, 0.6] },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={`mx-auto max-w-6xl rounded-2xl transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ${
          lifted || open
            ? "border border-line/80 bg-ink/75 shadow-lg shadow-black/20 backdrop-blur-xl"
            : "border border-line/35 bg-ink/25 backdrop-blur-md"
        }`}
      >
        <nav
          className={`flex items-center justify-between px-3 transition-[height] duration-500 sm:px-4 ${
            lifted ? "h-14" : "h-16"
          }`}
        >
          <Link href="/" aria-label="BayFlow home" className="shrink-0">
            <Logo />
          </Link>

          {/* The links sit in their own rail, which draws itself once the bar
              lifts — so the nav reads as one object instead of three floating
              words. The marker slides between them rather than cutting. */}
          <div
            className="hidden items-center gap-0.5 rounded-full p-1 md:flex"
          >
            {LINKS.map((l) => {
              const active = section === l.section;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "true" : undefined}
                  className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                    active
                      ? "text-amber-ink"
                      : "text-muted-foreground hover:bg-surface-2/70 hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-marker"
                      className="absolute inset-0 -z-10 rounded-full border border-amber/35 bg-amber/10"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <span className="hidden sm:inline-flex">{authSlot}</span>
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
            <Button
              render={<Link href="/#shops" />}
              size="sm"
              className="sheen h-9 rounded-lg px-4"
            >
              Book a service
            </Button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="nav-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 text-steel transition-colors hover:text-foreground md:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="nav-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden md:hidden"
            >
              <div className="flex flex-col gap-1 px-3 pb-3 sm:px-4">
                {LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="hairline-t mt-2 flex items-center gap-2 pt-3 sm:hidden">
                  <ThemeToggle />
                  {authSlot}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How far down the page you are. Drawn as a lamp travelling the rail
            rather than a flat bar, so it never reads as a second border: the
            track fades in from nothing and a soft head leads the edge. */}
        <div
          aria-hidden
          className={`relative mx-3 h-0.5 overflow-hidden rounded-full transition-opacity duration-500 sm:mx-4 ${
            lifted ? "opacity-100" : "opacity-0"
          }`}
        >
          <motion.div
            className="h-full origin-left"
            style={{
              scaleX: scrollYProgress,
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--amber) 45%, transparent) 55%, var(--amber))",
            }}
          />
          <motion.span
            className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber"
            style={{ left: headPosition, boxShadow: "0 0 10px 2px var(--amber)" }}
          />
        </div>
      </div>
    </header>
  );
}
