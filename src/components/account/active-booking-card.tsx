"use client";

import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { CalendarClock } from "lucide-react";
import { trackPointer } from "@/lib/pointer";
import { photoBackground } from "@/lib/images";
import { StatusBadge } from "@/components/booking/status-badge";
import { ProgressRail } from "@/components/booking/progress-rail";

/**
 * One car "in the shop" — the shop's own bay as a photo banner (not a flat
 * colour header), the seven-phase rail, and the plain-language status copy.
 * Client component so the pointer-tracked spotlight/edge-glow can attach
 * `onPointerMove` from inside, rather than receiving it as a prop from the
 * server page (functions can't cross that boundary — see `NeedsYouCard`).
 */
export function ActiveBookingCard({
  href,
  status,
  vehicleLabel,
  plate,
  shopName,
  shopCoverImage,
  coverFallback,
  statusCopy,
  slotLabel,
  code,
  delayMs,
}: {
  href: string;
  status: BookingStatus;
  vehicleLabel: string;
  plate: string;
  shopName: string;
  shopCoverImage: string;
  coverFallback: string;
  statusCopy: string;
  slotLabel: string;
  code: string;
  delayMs: number;
}) {
  return (
    <Link
      href={href}
      onPointerMove={trackPointer}
      style={{ animation: `card-in .6s cubic-bezier(.16,1,.3,1) ${delayMs}ms backwards` }}
      className="spotlight edge-glow group panel flex flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-steel/40 hover:shadow-xl hover:shadow-black/10"
    >
      {/* The shop's bay, so the card is somewhere real, not a form row. */}
      <div className="relative h-24 shrink-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          style={photoBackground(shopCoverImage, coverFallback)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
        <span className="readout absolute bottom-2 left-3 text-[0.65rem] text-foreground/90 drop-shadow">
          {shopName}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display-md text-lg text-foreground">{vehicleLabel}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{plate}</span>
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
        <ProgressRail status={status} compact className="mt-5" />
        <p className="mt-4 flex-1 text-sm text-steel">{statusCopy}</p>
        <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {slotLabel}
          </span>
          <span className="font-mono">{code}</span>
        </div>
      </div>
    </Link>
  );
}
