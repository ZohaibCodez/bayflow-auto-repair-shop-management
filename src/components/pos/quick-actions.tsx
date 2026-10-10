"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackPointer } from "@/lib/pointer";

export type QuickAction = {
  href: string;
  label: string;
  hint: string;
  /** Pre-rendered by the caller (a Server Component), not a component
   *  reference — a function can't cross the server→client boundary as a
   *  prop, only an already-built element can. */
  icon: ReactNode;
  /** Shown as a small count badge — e.g. "2 open" on the QC queue tile. */
  badge?: number;
};

/**
 * The real next moves for this role, as a one-tap grid instead of a sentence
 * buried in the sidebar. Every tile is a route that already exists — nothing
 * here promises a feature the app doesn't have.
 *
 * `trackPointer` drives `.spotlight`/`.edge-glow`: a hover highlight that
 * follows the cursor without costing a React render (see `lib/pointer.ts`).
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (!actions.length) return null;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {actions.map((a, i) => (
        <Link
          key={a.href}
          href={a.href}
          onPointerMove={trackPointer}
          className="spotlight edge-glow group relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3.5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-steel/40"
          style={{ animation: `hero-in .45s cubic-bezier(.16,1,.3,1) ${i * 55}ms backwards` }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-steel transition-colors duration-300 group-hover:bg-amber/15 group-hover:text-amber-ink [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-300 group-hover:[&_svg]:scale-110">
              {a.icon}
            </span>
            {typeof a.badge === "number" && a.badge > 0 && (
              <span className="readout grid h-5 min-w-5 place-items-center rounded-full bg-amber/15 px-1 text-[0.65rem] text-amber-ink">
                {a.badge}
              </span>
            )}
          </div>
          <p className="mt-2.5 truncate text-sm font-medium text-foreground">{a.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.hint}</p>
        </Link>
      ))}
    </div>
  );
}
