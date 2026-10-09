import Link from "next/link";
import { ArrowRight, BellRing, CalendarClock, CarFront, CheckCircle2, Plus } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { requireUser } from "@/lib/rbac";
import { STATUS_META } from "@/lib/booking/status-meta";
import { formatDateTime } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import { getCustomerBookings } from "@/server/queries/bookings";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/booking/status-badge";
import { ProgressRail } from "@/components/booking/progress-rail";
import { estimateTotal } from "@/components/booking/estimate-view";

export const metadata = { title: "My bookings — BayFlow" };

export default async function AccountPage() {
  const user = await guard(requireUser(), "/account");
  const bookings = await getCustomerBookings(user.id);
  const active = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED");
  const needsYou = active.filter((b) => b.status === "AWAITING_CUSTOMER" || b.status === "READY_FOR_PICKUP");

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Your garage</p>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">Hi {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-muted-foreground">
            {active.length
              ? `You have ${active.length} car${active.length > 1 ? "s" : ""} in the shop.`
              : "No cars in the shop right now."}
          </p>
        </div>
        <Button render={<Link href="/#shops" />} className="h-10 px-4">
          <Plus /> New booking
        </Button>
      </div>

      {needsYou.map((b) => {
        const ready = b.status === "READY_FOR_PICKUP";
        const total = b.estimates[0] ? estimateTotal(b.estimates[0].items) : 0;
        return (
          <Link
            key={`cta-${b.id}`}
            href={`/account/bookings/${b.id}`}
            className={
              ready
                ? "group panel flex items-center gap-4 border-teal/40 p-4 transition-colors hover:border-teal/70 sm:p-5"
                : "group panel relative flex items-center gap-4 overflow-hidden border-amber/40 p-4 transition-colors hover:border-amber/70 sm:p-5"
            }
          >
            {!ready && <span className="pointer-events-none absolute inset-0 amber-glow" aria-hidden />}
            <span
              className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${ready ? "bg-teal/15 text-teal" : "bg-amber/15 text-amber"}`}
            >
              {ready ? <CheckCircle2 className="size-5" /> : <BellRing className="size-5" />}
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="font-medium text-foreground">
                {ready ? "Your car is ready for pick-up" : "Estimate awaiting your approval"}
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {b.vehicle.make} {b.vehicle.model} at {b.shop.name}
                {!ready && total ? ` · ${formatPKR(total)}` : ""}
              </p>
            </div>
            <span className={`relative flex items-center gap-1 text-sm ${ready ? "text-teal" : "text-amber"}`}>
              {ready ? "Details" : "Review"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        );
      })}

      <section className="space-y-4">
        <h2 className="eyebrow">In the shop</h2>
        {active.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((b) => (
              <Link
                key={b.id}
                href={`/account/bookings/${b.id}`}
                className="group panel flex flex-col p-5 transition-colors hover:border-steel/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display-md text-lg text-foreground">
                      {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{b.vehicle.plate}</span> · {b.shop.name}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <ProgressRail status={b.status} compact className="mt-5" />
                <p className="mt-4 flex-1 text-sm text-steel">{STATUS_META[b.status].customer}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" />
                    {b.slot ? formatDateTime(b.slot.startsAt) : "—"}
                  </span>
                  <span className="font-mono">{b.code}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel flex flex-col items-center px-6 py-14 text-center">
            <CarFront className="size-8 text-steel/60" />
            <p className="mt-3 font-medium text-foreground">Nothing in the shop</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Book a service and follow every step of the repair right here.
            </p>
            <Button render={<Link href="/#shops" />} className="mt-5 h-10 px-4">
              Find a shop
            </Button>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="eyebrow">History</h2>
          <ul className="panel divide-y divide-line/70 overflow-hidden">
            {past.map((b) => (
              <li key={b.id}>
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
