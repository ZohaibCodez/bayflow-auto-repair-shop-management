import { prisma } from "@/lib/db";
import { LISTED_SHOP } from "@/server/queries/shop";
import { slotStartsFor, type WorkingHours } from "@/lib/slots";
import { addDaysToKey, formatDay, formatTime, shopDateKey } from "@/lib/time";
import { BOOKING_STAGES } from "@/lib/booking/statuses";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Hero } from "@/components/marketing/hero";
import { InstrumentStrip, type Readout } from "@/components/marketing/instrument-strip";
import { PitLane } from "@/components/marketing/pit-lane";
import { Roles } from "@/components/marketing/roles";
import { OwnerCta } from "@/components/marketing/owner-cta";
import type { ShopCardData } from "@/components/marketing/shop-card";
import { ShopDirectory } from "@/components/marketing/shop-directory";

export const dynamic = "force-dynamic";

/** First slot start in the coming week from working hours (shop time), at least 30 min out. */
function nextOpening(hours: WorkingHours, durationMin: number): string | null {
  const cutoff = Date.now() + 30 * 60_000;
  let key = shopDateKey();
  for (let i = 0; i < 7; i++, key = addDaysToKey(key, 1)) {
    const next = slotStartsFor(hours, key, durationMin).find((s) => s.getTime() > cutoff);
    if (next)
      return `${i === 0 ? "today" : i === 1 ? "tomorrow" : formatDay(next).split(" ")[0]} ${formatTime(next)}`;
  }
  return null;
}

/**
 * One query feeds both the directory and the instrument strip, so every figure
 * on the page is the real state of the database at request time.
 */
async function getDirectory() {
  const shops = await prisma.shop.findMany({
    where: LISTED_SHOP,
    orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
    include: { services: { where: { active: true }, select: { name: true } } },
  });

  const cards: ShopCardData[] = shops.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    description: s.description,
    rating: s.rating,
    coverImage: s.coverImage,
    serviceNames: s.services.map((v) => v.name),
    nextSlotLabel: nextOpening(s.workingHours as WorkingHours, s.slotDurationMin),
  }));

  const readouts: Readout[] = [
    {
      label: "Shops taking bookings",
      value: shops.length,
      note: "Listed once they have a service and a technician",
    },
    {
      label: "Cities covered",
      value: new Set(shops.map((s) => s.city)).size,
      note: "Filter the directory by any of them",
    },
    {
      label: "Bays bookable at once",
      value: shops.reduce((n, s) => n + s.slotCapacity, 0),
      note: "Each shop sets its own capacity per slot",
    },
    {
      label: "Services on offer",
      value: shops.reduce((n, s) => n + s.services.length, 0),
      note: "Shops write their own catalogue",
    },
    {
      label: "Stages every job passes",
      value: BOOKING_STAGES.length,
      note: "Fixed order, one owner each, no skipping",
    },
  ];

  return { cards, readouts };
}

export default async function Home() {
  const { cards, readouts } = await getDirectory();

  return (
    <>
      <span id="top" />
      <SiteNav />
      <main className="flex-1">
        <Hero shopCount={cards.length} />
        <InstrumentStrip readouts={readouts} />

        <section id="shops" className="relative border-t border-line/60 bg-ink">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="max-w-xl">
              <h2 className="display text-[clamp(2rem,4.6vw,3.25rem)] text-foreground">
                Shops near you
              </h2>
              <p className="mt-4 max-w-[52ch] text-muted-foreground">
                Independent garages running on BayFlow. Pick one, describe what&rsquo;s wrong in
                your own words, and take a slot in under a minute.
              </p>
            </div>

            <ShopDirectory shops={cards} />
          </div>
        </section>

        <PitLane />
        <Roles />
        <OwnerCta />
      </main>
      <SiteFooter />
    </>
  );
}
