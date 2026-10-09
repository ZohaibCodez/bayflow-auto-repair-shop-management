"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShopCard, type ShopCardData } from "./shop-card";
import { FallbackImage } from "@/components/fallback-image";
import { IMAGES } from "@/lib/images";

/** Shop grid with text search (name, service, description) and a city filter. */
export function ShopDirectory({ shops }: { shops: ShopCardData[] }) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const cities = useMemo(() => [...new Set(shops.map((s) => s.city))].sort(), [shops]);

  const needle = q.trim().toLowerCase();
  const visible = shops.filter(
    (s) =>
      (!city || s.city === city) &&
      (!needle ||
        s.name.toLowerCase().includes(needle) ||
        s.description?.toLowerCase().includes(needle) ||
        s.serviceNames.some((n) => n.toLowerCase().includes(needle))),
  );

  return (
    <>
      <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shops or services — e.g. AC, brakes"
            aria-label="Search shops"
            className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-amber/50 focus-visible:ring-3 focus-visible:ring-amber/20"
          />
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by city">
          {[null, ...cities].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              onClick={() => setCity(c)}
              aria-pressed={city === c}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-sm transition-colors",
                city === c
                  ? "border-amber/40 bg-amber/10 text-amber"
                  : "border-line text-muted-foreground hover:text-foreground",
              )}
            >
              {c ?? "All cities"}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-line py-14 text-center">
          <FallbackImage
            src={IMAGES.empty.noResults}
            alt=""
            className="h-28 w-auto"
            fallback={<SearchX className="size-6 text-steel/60" />}
          />
          <p className="mt-3 text-sm text-foreground">No shops match that.</p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCity(null);
            }}
            className="mt-2 text-sm text-amber hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
