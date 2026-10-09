"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShopCard, type ShopCardData } from "./shop-card";
import { FallbackImage } from "@/components/fallback-image";
import { IMAGES } from "@/lib/images";

/**
 * Shop grid with text search (name, service, description) and a city filter.
 *
 * Filtering removes cards immediately rather than animating them out — the list
 * is the answer to a question the person just asked, so it should never show a
 * shop that no longer matches, even for 200ms.
 */
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
  const filtered = Boolean(needle) || city !== null;

  return (
    <>
      <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shops or services — try brakes"
            aria-label="Search shops"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-amber/60 focus-visible:ring-3 focus-visible:ring-amber/20"
          />
        </div>
        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
          role="group"
          aria-label="Filter by city"
        >
          {[null, ...cities].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              onClick={() => setCity(c)}
              aria-pressed={city === c}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors",
                city === c
                  ? "border-amber/50 bg-amber/10 text-amber-ink"
                  : "border-line text-muted-foreground hover:border-line hover:text-foreground",
              )}
            >
              {c ?? "All cities"}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <>
          {filtered && (
            <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
              <span className="readout text-foreground">{visible.length}</span>{" "}
              {visible.length === 1 ? "shop" : "shops"} match
            </p>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((shop, i) => (
              <div
                // Re-keyed on the filter so matches arrive in a short stagger.
                key={`${needle}|${city}|${shop.id}`}
                className="opacity-0"
                style={{
                  animation: `hero-in .55s cubic-bezier(.16,1,.3,1) ${Math.min(i, 8) * 45}ms forwards`,
                }}
              >
                <ShopCard shop={shop} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line py-16 text-center">
          <FallbackImage
            src={IMAGES.empty.noResults}
            alt=""
            className="h-28 w-auto"
            fallback={<SearchX className="size-7 text-steel/60" />}
          />
          <p className="mt-4 text-foreground">No shops match that.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a service instead of a shop name — oil, brakes, AC.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCity(null);
            }}
            className="mt-4 rounded-lg px-3 py-1.5 text-sm text-amber-ink underline decoration-amber/40 underline-offset-4 hover:decoration-amber"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
