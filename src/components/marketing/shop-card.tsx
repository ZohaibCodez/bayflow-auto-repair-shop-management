import Link from "next/link";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ShopCardData = {
  id: string;
  name: string;
  city: string;
  description: string | null;
  rating: number | null;
  serviceNames: string[];
  nextSlotLabel: string | null;
};

export function ShopCard({ shop }: { shop: ShopCardData }) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-panel)] transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-amber/40">
      {/* top ignition rule — grows on hover */}
      <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-amber transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display-md text-xl text-foreground">{shop.name}</h3>
          {shop.rating != null && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-xs text-amber">
              <Star className="size-3 fill-current" /> {shop.rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {shop.city}
        </p>
        {shop.description && <p className="mt-3 line-clamp-2 text-sm text-steel">{shop.description}</p>}

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
            <li className="px-1.5 py-1 text-xs text-muted-foreground">+{shop.serviceNames.length - 4} more</li>
          )}
        </ul>

        <div className="mt-auto flex items-center justify-between border-t border-line/70 pt-4">
          {shop.nextSlotLabel ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-teal" />
              Next opening {shop.nextSlotLabel}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">No openings this week</span>
          )}

          <Button
            render={<Link href={`/book/${shop.id}`} />}
            size="sm"
            variant="ghost"
            className="-mr-2 text-amber hover:text-amber"
          >
            Book
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
