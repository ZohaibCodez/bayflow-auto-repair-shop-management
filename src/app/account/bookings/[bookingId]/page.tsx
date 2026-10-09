import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  FileText,
  MapPin,
  PartyPopper,
  Phone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { guard } from "@/lib/page-guard";
import { requireBookingAccess } from "@/lib/rbac";
import { availableActions } from "@/lib/booking/state-machine";
import { STATUS_META, TONE_CLASS } from "@/lib/booking/status-meta";
import { formatDateTime, formatLongDay, formatTime } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getBookingDetail } from "@/server/queries/bookings";
import { StatusBadge } from "@/components/booking/status-badge";
import { ProgressRail } from "@/components/booking/progress-rail";
import { Timeline } from "@/components/booking/timeline";
import { EstimateView, estimateTotal } from "@/components/booking/estimate-view";
import { CancelBooking, EstimateDecision, PickupButton } from "@/components/booking/customer-actions";
import { FallbackImage } from "@/components/fallback-image";
import { IMAGES } from "@/lib/images";

export default async function CustomerBookingPage({
  params,
  searchParams,
}: PageProps<"/account/bookings/[bookingId]">) {
  const { bookingId } = await params;
  const sp = await searchParams;
  const { actor, booking: ref } = await guard(requireBookingAccess(bookingId), `/account/bookings/${bookingId}`);
  // This page is the customer's view; staff use the POS job page.
  if (ref.customerId !== actor.userId) notFound();

  const b = await getBookingDetail(bookingId);
  if (!b) notFound();

  // Customer-only actions (strip any staff roles the same person may hold in this shop).
  const actions = availableActions(b, { userId: actor.userId, isOwner: false, roles: [] });
  const meta = STATUS_META[b.status];
  const tone = TONE_CLASS[meta.tone];
  const shown = b.estimates.find((e) => e.status !== "DRAFT");
  const total = shown ? estimateTotal(shown.items) : 0;
  const openIssues = b.issues.filter((i) => !i.resolved);

  return (
    <div className="space-y-6">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> My bookings
      </Link>

      {sp.booked === "1" && (
        <div className="panel relative overflow-hidden border-teal/40 p-5">
          <div className="flex items-start gap-4">
            <FallbackImage
              src={IMAGES.bookedSuccess}
              alt=""
              className="size-20 shrink-0"
              fallback={
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
                  <PartyPopper className="size-5" />
                </span>
              }
            />
            <div>
              <p className="font-display-md text-lg text-foreground">You&rsquo;re booked in!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reference <span className="font-mono text-foreground">{b.code}</span>. {b.shop.name} will confirm shortly —
                you&rsquo;ll see every step here and get a notification when something needs you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="panel relative overflow-hidden p-5 sm:p-7">
        <div className={cn("pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl opacity-20", tone.dot)} aria-hidden />
        <div className="relative flex flex-wrap items-center gap-3">
          <StatusBadge status={b.status} size="md" />
          <span className="font-mono text-xs text-muted-foreground">{b.code}</span>
        </div>
        <h1 className="relative mt-4 font-display text-3xl text-foreground sm:text-4xl">
          {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
        </h1>
        <p className="relative mt-3 max-w-xl text-base text-steel">{meta.customer}</p>
        <ProgressRail status={b.status} className="relative mt-7" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Estimate decision */}
          {shown && (
            <section
              className={cn(
                "panel p-5 sm:p-6",
                actions.includes("approveEstimate") && "border-amber/40 shadow-[0_0_0_1px_var(--amber)_inset]",
              )}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="eyebrow">Estimate · version {shown.revision}</p>
                  {actions.includes("approveEstimate") && (
                    <p className="mt-1 font-display-md text-xl text-foreground">Your approval is needed</p>
                  )}
                </div>
                {shown.respondedAt && (
                  <span className={cn("text-xs", shown.status === "APPROVED" ? "text-teal" : "text-signal-red")}>
                    You {shown.status === "APPROVED" ? "approved" : "declined"} on {formatDateTime(shown.respondedAt)}
                  </span>
                )}
              </div>
              <EstimateView items={shown.items} />
              {actions.includes("approveEstimate") && (
                <div className="mt-6 space-y-3 border-t border-line pt-5">
                  <p className="text-sm text-muted-foreground">
                    No work starts until you approve. Your decision is time-stamped and shared with the shop.
                  </p>
                  <EstimateDecision bookingId={b.id} total={formatPKR(total)} />
                </div>
              )}
            </section>
          )}

          {actions.includes("complete") && (
            <section className="panel flex flex-col gap-4 border-teal/40 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 text-teal" />
                <div>
                  <p className="font-medium text-foreground">Ready when you are</p>
                  <p className="text-sm text-muted-foreground">Passed quality check. Collect it from {b.shop.name}.</p>
                </div>
              </div>
              <PickupButton bookingId={b.id} />
            </section>
          )}

          {openIssues.length > 0 && b.status === "IN_REPAIR" && (
            <section className="panel flex items-start gap-3 p-5">
              <ShieldAlert className="mt-0.5 size-5 text-amber" />
              <p className="text-sm text-steel">
                Our quality inspector spotted something and sent the car back to the technician — it&rsquo;ll be re-checked
                before it&rsquo;s handed back to you.
              </p>
            </section>
          )}

          <section className="panel p-5 sm:p-6">
            <h2 className="eyebrow mb-4">Progress</h2>
            <Timeline events={b.timeline} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel divide-y divide-line/70">
            <div className="p-4">
              <p className="eyebrow mb-2">Shop</p>
              <p className="text-sm font-medium text-foreground">{b.shop.name}</p>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" /> {b.shop.address}, {b.shop.city}
              </p>
              <a href={`tel:${b.shop.phone.replace(/\s/g, "")}`} className="mt-1 flex items-center gap-1.5 text-sm text-amber hover:underline">
                <Phone className="size-3.5" /> {b.shop.phone}
              </a>
            </div>
            {b.slot && (
              <div className="p-4">
                <p className="eyebrow mb-2 flex items-center gap-1.5">
                  <CalendarClock className="size-3" /> Appointment
                </p>
                <p className="text-sm text-foreground">{formatLongDay(b.slot.startsAt)}</p>
                <p className="text-sm text-muted-foreground">{formatTime(b.slot.startsAt)}</p>
              </div>
            )}
            <div className="p-4">
              <p className="eyebrow mb-2">You asked for</p>
              <div className="flex flex-wrap gap-1.5">
                {b.serviceNames.map((s) => (
                  <span key={s} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-steel">
                    {s}
                  </span>
                ))}
              </div>
              {b.problems && <p className="mt-2 text-sm text-muted-foreground">&ldquo;{b.problems}&rdquo;</p>}
            </div>
            <div className="p-4">
              <p className="eyebrow mb-2">Vehicle</p>
              <p className="text-sm text-foreground">
                {b.vehicle.make} {b.vehicle.model} {b.vehicle.year}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{b.vehicle.plate}</p>
            </div>
          </section>
          {b.estimates.some((e) => e.status === "APPROVED") && (
            <Link
              href={`/invoice/${b.id}`}
              className="panel flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:border-amber/40"
            >
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-amber" />
                {b.status === "COMPLETED" ? "View invoice" : "View job sheet"}
              </span>
              <span className="text-muted-foreground">→</span>
            </Link>
          )}
          {actions.includes("cancel") && (
            <div className="px-1">
              <CancelBooking bookingId={b.id} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
