import Link from "next/link";
import { CarFront, Plus } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import { getCustomerBookings } from "@/server/queries/bookings";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/booking/status-badge";
import { STATUS_META } from "@/lib/booking/status-meta";
import { estimateTotal } from "@/components/booking/estimate-view";
import { FallbackImage } from "@/components/fallback-image";
import { IMAGES } from "@/lib/images";
import { COVER_FALLBACK } from "@/components/marketing/shop-card";
import { Odometer } from "@/components/number-reel";
import { NeedsYouCard } from "@/components/account/needs-you-card";
import { ActiveBookingCard } from "@/components/account/active-booking-card";

export const metadata = { title: "My bookings — BayFlow" };

export default async function AccountPage() {
  const user = await guard(requireUser(), "/account");
  const bookings = await getCustomerBookings(user.id);
  const active = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED");
  const needsYou = active.filter((b) => b.status === "AWAITING_CUSTOMER" || b.status === "READY_FOR_PICKUP");

  return (
    <div className="space-y-10">
      {/* ---- Command line ---------------------------------------------------
          The same faint instrument grid the landing hero stands on, dimmed
          down to a texture rather than a stage — so the garage reads as part
          of one product, not a plainer screen bolted onto a cinematic one. */}
      <div
        className="relative -mx-4 overflow-hidden px-4 pt-8 pb-2 sm:-mx-6 sm:px-6"
        style={{ animation: "hero-in .5s cubic-bezier(.16,1,.3,1) backwards" }}
      >
        <div className="bay-grid amber-glow pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Your garage</p>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl">
              Hi {user.name.split(" ")[0]}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {active.length ? (
                <>
                  You have <Odometer value={active.length} /> car
                  {active.length === 1 ? "" : "s"} in the shop.
                </>
              ) : (
                "No cars in the shop right now."
              )}
            </p>
          </div>
          <Button render={<Link href="/#shops" />} className="sheen h-10 px-4">
            <Plus /> New booking
          </Button>
        </div>
      </div>

      {needsYou.map((b, i) => (
        <NeedsYouCard
          key={`cta-${b.id}`}
          href={`/account/bookings/${b.id}`}
          ready={b.status === "READY_FOR_PICKUP"}
          vehicleLabel={`${b.vehicle.make} ${b.vehicle.model}`}
          shopName={b.shop.name}
          shopCoverImage={b.shop.coverImage ?? IMAGES.defaultShop}
          coverFallback={COVER_FALLBACK}
          priceLabel={
            b.status === "AWAITING_CUSTOMER" && b.estimates[0]
              ? formatPKR(estimateTotal(b.estimates[0].items))
              : null
          }
          delayMs={i * 70}
        />
      ))}

      <section className="space-y-4">
        <h2 className="eyebrow">In the shop</h2>
        {active.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((b, i) => (
              <ActiveBookingCard
                key={b.id}
                href={`/account/bookings/${b.id}`}
                status={b.status}
                vehicleLabel={`${b.vehicle.year} ${b.vehicle.make} ${b.vehicle.model}`}
                plate={b.vehicle.plate}
                shopName={b.shop.name}
                shopCoverImage={b.shop.coverImage ?? IMAGES.defaultShop}
                coverFallback={COVER_FALLBACK}
                statusCopy={STATUS_META[b.status].customer}
                slotLabel={b.slot ? formatDateTime(b.slot.startsAt) : "—"}
                code={b.code}
                delayMs={i * 90}
              />
            ))}
          </div>
        ) : (
          <div className="panel flex flex-col items-center px-6 py-14 text-center">
            <FallbackImage
              src={IMAGES.empty.noBookings}
              alt=""
              className="h-32 w-auto"
              fallback={<CarFront className="size-8 text-steel/60" />}
            />
            <p className="mt-3 font-medium text-foreground">Nothing in the shop</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Book a service and follow every step of the repair right here.
            </p>
            <Button render={<Link href="/#shops" />} className="sheen mt-5 h-10 px-4">
              Find a shop
            </Button>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="eyebrow">History</h2>
          <ul className="panel divide-y divide-line/70 overflow-hidden">
            {past.map((b, i) => (
              <li
                key={b.id}
                style={{
                  animation: `hero-in .4s cubic-bezier(.16,1,.3,1) ${Math.min(i, 8) * 45}ms backwards`,
                }}
              >
                <Link
                  href={`/account/bookings/${b.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-2/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {b.vehicle.make} {b.vehicle.model} · {b.shop.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.serviceNames.join(", ")} · {b.slot ? formatDateTime(b.slot.startsAt) : ""}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
