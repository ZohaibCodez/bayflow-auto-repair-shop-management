"use client";

import Link from "next/link";
import { ArrowRight, BellRing, CheckCircle2 } from "lucide-react";
import { trackPointer } from "@/lib/pointer";
import { photoBackground } from "@/lib/images";

/**
 * The one thing on the dashboard the customer actually has to act on —
 * pending estimate or car ready for pick-up. A client component (not just a
 * styled Link) because the pointer-tracked glow needs `onPointerMove`, and a
 * function can't cross the server→client boundary as a prop: the handler has
 * to be attached from inside client code, same as `ShopCard` on the landing
 * page and `FloorBoard` in the POS.
 */
export function NeedsYouCard({
  href,
  ready,
  vehicleLabel,
  shopName,
  shopCoverImage,
  coverFallback,
  priceLabel,
  delayMs,
}: {
  href: string;
  ready: boolean;
  vehicleLabel: string;
  shopName: string;
  shopCoverImage: string;
  coverFallback: string;
  priceLabel: string | null;
  delayMs: number;
}) {
  return (
    <Link
      href={href}
      onPointerMove={trackPointer}
      style={{ animation: `hero-in .5s cubic-bezier(.16,1,.3,1) ${delayMs}ms backwards` }}
      className={
        ready
          ? "edge-glow group panel relative flex items-center gap-4 overflow-hidden border-teal/40 p-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-teal/70 sm:p-5"
          : "edge-glow group panel relative flex items-center gap-4 overflow-hidden border-amber/40 p-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-amber/70 sm:p-5"
      }
    >
      {/* The shop's own photo, dimmed into the panel — real context instead
          of a flat colour card. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.14] transition-opacity duration-500 group-hover:opacity-[0.22]"
        style={photoBackground(shopCoverImage, coverFallback)}
      />
      <div
        aria-hidden
        className={
          ready
            ? "pointer-events-none absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent"
            : "pointer-events-none absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent amber-glow"
        }
      />
      <span
        className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${ready ? "bg-teal/15 text-teal" : "bg-amber/15 text-amber pulse-dot"}`}
      >
        {ready ? <CheckCircle2 className="size-5" /> : <BellRing className="size-5" />}
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {ready ? "Your car is ready for pick-up" : "Estimate awaiting your approval"}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {vehicleLabel} at {shopName}
          {!ready && priceLabel ? ` · ${priceLabel}` : ""}
        </p>
      </div>
      <span className={`relative flex items-center gap-1 text-sm ${ready ? "text-teal" : "text-amber"}`}>
        {ready ? "Details" : "Review"}
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
