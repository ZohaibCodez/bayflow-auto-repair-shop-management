"use client";

import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMAGES, photoBackground } from "@/lib/images";
import { trackPointer } from "@/lib/pointer";

export type ShopCardData = {
  id: string;
  name: string;
  city: string;
  description: string | null;
  rating: number | null;
  coverImage: string | null;
  serviceNames: string[];
  nextSlotLabel: string | null;
};

/** Painted when a shop has no cover photo (or the file isn't there yet). */
export const COVER_FALLBACK =
  "radial-gradient(120% 90% at 85% 0%, color-mix(in oklab, var(--amber) 24%, transparent), transparent 60%), " +
  "repeating-linear-gradient(90deg, color-mix(in oklab, var(--line) 60%, transparent) 0 1px, transparent 1px 34px), " +
  "linear-gradient(160deg, var(--surface-2), var(--surface))";

export function ShopCard({ shop }: { shop: ShopCardData }) {
  return (
    <article
      onPointerMove={trackPointer}
      className="spotlight edge-glow group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-panel)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/15"
    >
      <div className="relative h-40 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          style={photoBackground(shop.coverImage ?? IMAGES.defaultShop, COVER_FALLBACK)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/15 to-transparent" />
        {shop.rating != null && (
          <span className="readout absolute top-3 right-3 flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs text-foreground backdrop-blur">
            <Star className="size-3 fill-amber text-amber" />
            {shop.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 pt-1">
        <h3 className="font-display-md text-xl text-foreground">{shop.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {shop.city}
        </p>
        {shop.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-steel">{shop.description}</p>
        )}

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {shop.serviceNames.slice(0, 4).map((name) => (
            <li
              key={name}
              className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-steel"
            >
              {name}
            </li>
          ))}
          {shop.serviceNames.length > 4 && (
            <li className="px-1.5 py-1 text-xs text-muted-foreground">
              +{shop.serviceNames.length - 4} more
            </li>
          )}
        </ul>

        <div className="hairline-t mt-auto flex items-center justify-between gap-3 pt-4">
          {shop.nextSlotLabel ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="pulse-dot size-1.5 rounded-full bg-teal text-teal" />
              Next opening {shop.nextSlotLabel}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">No openings this week</span>
          )}

          {/* Quiet until you reach for the card, so the grid doesn't become a
              wall of amber — on this page amber means "here is the work". */}
          <Button
            render={<Link href={`/book/${shop.id}`} />}
            size="sm"
            variant="outline"
            className="h-8 shrink-0 rounded-lg border-line px-3.5 transition-colors group-hover:border-amber group-hover:bg-amber group-hover:text-primary-foreground"
          >
            Book
          </Button>
        </div>
      </div>
    </article>
  );
}
