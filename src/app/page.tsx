import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Hero } from "@/components/marketing/hero";
import { Lifecycle } from "@/components/marketing/lifecycle";
import { ShopCard, type ShopCardData } from "@/components/marketing/shop-card";

export const dynamic = "force-dynamic";

async function getShops(): Promise<ShopCardData[]> {
  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "asc" },
    include: { services: { where: { active: true }, select: { name: true } } },
  });

  const now = new Date();
  const nextSlots = await Promise.all(
    shops.map((s) =>
      prisma.slot.findFirst({
        where: { shopId: s.id, startsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
      }),
    ),
  );

  return shops.map((s, i) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    serviceNames: s.services.map((v) => v.name),
    nextSlotLabel: nextSlots[i] ? format(nextSlots[i]!.startsAt, "EEE HH:mm") : null,
  }));
}

export default async function Home() {
  const shops = await getShops();

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero shopCount={shops.length} />

        {/* Shop directory */}
        <section id="shops" className="relative border-t border-line/60 bg-ink">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                  Shops near you
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Independent garages running on BayFlow. Pick one, tell them what&rsquo;s
                  wrong, and book a slot in under a minute.
                </p>
              </div>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          </div>
        </section>

        <Lifecycle />

        {/* Owner CTA */}
        <section className="relative border-t border-line/60 bg-ink">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-amber/25 bg-surface p-8 sm:p-12">
              <div className="pointer-events-none absolute inset-0 amber-glow" aria-hidden />
              <div className="relative max-w-2xl">
                <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                  Run a repair shop?
                </h2>
                <p className="mt-4 max-w-md text-muted-foreground">
                  Create your shop, add your team by role, and put the whole floor on
                  one board — bookings, estimates, parts and quality checks in one place.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button render={<Link href="/signup" />} size="lg" className="h-11 px-6">
                    Start free
                  </Button>
                  <Button
                    render={<Link href="/login" />}
                    size="lg"
                    variant="outline"
                    className="h-11 px-6"
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
