import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ShopCardData = {
  id: string;
  name: string;
  city: string;
  serviceNames: string[];
  nextSlotLabel: string | null;
};

export function ShopCard({ shop }: { shop: ShopCardData }) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-amber/40">
      {/* top ignition rule — grows on hover */}
      <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-amber transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display-md text-xl text-foreground">{shop.name}</h3>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {shop.city}
        </p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {shop.serviceNames.slice(0, 4).map((name) => (
            <li
              key={name}
              className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-steel"
            >
              {name}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between border-t border-line/70 pt-4">
          {shop.nextSlotLabel ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-teal" />
              Next slot {shop.nextSlotLabel}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">No open slots</span>
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
