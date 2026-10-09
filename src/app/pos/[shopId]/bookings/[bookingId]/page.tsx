import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  Car,
  ChevronLeft,
  FileText,
  History,
  Mail,
  Receipt,
  Package,
  Phone,
  ShieldAlert,
  User,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { guard } from "@/lib/page-guard";
import { hasShopRole, requireBookingAccess, requireShopAccess } from "@/lib/rbac";
import { availableActions } from "@/lib/booking/state-machine";
import { STATUS_META } from "@/lib/booking/status-meta";
import { formatDateTime, formatLongDay, formatTime } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getBookingDetail } from "@/server/queries/bookings";
import { getStaffOptions } from "@/server/queries/shop";
import { StatusBadge } from "@/components/booking/status-badge";
import { ProgressRail } from "@/components/booking/progress-rail";
import { Timeline } from "@/components/booking/timeline";
import { EstimateView, estimateTotal } from "@/components/booking/estimate-view";
import { ActionPanel } from "@/components/booking/action-panel";

export default async function PosBookingPage({ params }: PageProps<"/pos/[shopId]/bookings/[bookingId]">) {
  const { shopId, bookingId } = await params;
  const here = `/pos/${shopId}/bookings/${bookingId}`;
  const { access } = await guard(requireShopAccess(shopId), here);
  const { booking: ref, actor } = await guard(requireBookingAccess(bookingId), here);
  if (ref.shopId !== shopId) notFound(); // a booking ID from another shop is simply not here

  const [b, staff, inventory] = await Promise.all([
    getBookingDetail(bookingId),
    getStaffOptions(shopId),
    prisma.inventoryItem.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
      select: { id: true, sku: true, name: true, qtyOnHand: true, unitCost: true },
    }),
  ]);
  if (!b) notFound();

  // Vehicle service history: earlier visits of the same plate at this shop.
  const history = await prisma.booking.findMany({
    where: { shopId, id: { not: b.id }, vehicle: { plate: b.vehicle.plate } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      code: true,
      status: true,
      serviceNames: true,
      createdAt: true,
      issues: { select: { id: true } },
    },
  });

  const actions = availableActions(b, actor);
  const meta = STATUS_META[b.status];
  const latest = b.estimates[0];
  const previous = b.estimates.slice(1);
  const draft = latest?.status === "DRAFT" ? latest.items : [];
  const openPOs = b.purchaseOrders.filter((po) => po.status !== "RECEIVED");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/pos/${shopId}/bookings`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Bookings
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{b.code}</span>
            <StatusBadge status={b.status} size="md" />
          </div>
          <h1 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
            {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="rounded border border-line bg-surface-2 px-1.5 py-px font-mono text-xs text-steel">
              {b.vehicle.plate}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" /> {b.customer.name}
            </span>
            {b.slot && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" /> {formatDateTime(b.slot.startsAt)}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-stretch gap-2">
          {b.estimates.some((e) => e.status === "APPROVED") && (
            <Link
              href={`/invoice/${b.id}`}
              className="panel-inset flex items-center gap-2 px-3 py-2 text-sm text-steel transition-colors hover:text-foreground"
            >
              <Receipt className="size-4 text-amber" />
              {b.status === "COMPLETED" ? "Invoice" : "Job sheet"}
            </Link>
          )}
          {meta.waitingOn !== "—" && (
            <div className="panel-inset px-3 py-2 text-right">
              <p className="eyebrow">Waiting on</p>
              <p className="mt-0.5 text-sm text-foreground">{meta.waitingOn}</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <ProgressRail status={b.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <ActionPanel
            bookingId={b.id}
            shopId={shopId}
            status={b.status}
            actions={actions}
            waitingOn={meta.waitingOn}
            technicians={staff.technicians}
            partsPeople={staff.partsPeople}
            inventory={inventory}
            draft={draft.map((i) => ({
              kind: i.kind,
              inventoryItemId: i.inventoryItemId,
              name: i.name,
              qty: i.qty,
              unitCost: i.unitCost,
            }))}
            requirement={b.requirement}
            openPOs={openPOs.map((po) => ({ id: po.id, status: po.status, supplier: po.supplier, items: po.items }))}
            canReceive={hasShopRole(access, ["OWNER", "PARTS"])}
            openIssues={b.issues.filter((i) => !i.resolved)}
          />

          {/* Customer report */}
          <section className="panel p-5">
            <h2 className="eyebrow mb-3 flex items-center gap-1.5">
              <FileText className="size-3" /> Customer&rsquo;s report
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {b.serviceNames.map((s) => (
                <span key={s} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-steel">
                  {s}
                </span>
              ))}
            </div>
            {b.problems ? (
              <blockquote className="mt-3 border-l-2 border-amber/50 pl-3 text-sm text-foreground">
                &ldquo;{b.problems}&rdquo;
              </blockquote>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No notes from the customer.</p>
            )}
            {b.notes && b.status === "CANCELLED" && (
              <p className="mt-3 text-sm text-signal-red">Cancellation note: {b.notes}</p>
            )}
          </section>

          {/* Estimate */}
          {latest && (
            <section className="panel p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="eyebrow">Estimate · revision {latest.revision}</h2>
                <EstimateStatus status={latest.status} />
              </div>
              <EstimateView items={latest.items} />
              <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                <div>Prepared by {latest.createdBy.name}</div>
                {latest.sentAt && <div>Sent {formatDateTime(latest.sentAt)}</div>}
                {latest.respondedAt && (
                  <div>
                    Customer {latest.status === "APPROVED" ? "approved" : "rejected"}{" "}
                    {formatDateTime(latest.respondedAt)}
                  </div>
                )}
              </dl>
              {latest.customerNote && (
                <p className="mt-3 rounded-lg border border-signal-red/25 bg-signal-red/5 px-3 py-2 text-sm text-steel">
                  Customer said: &ldquo;{latest.customerNote}&rdquo;
                </p>
              )}
              {previous.length > 0 && (
                <details className="group mt-4 border-t border-line pt-3">
                  <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground">
                    {previous.length} earlier version{previous.length > 1 ? "s" : ""} ▾
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {previous.map((e) => (
                      <li key={e.id} className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
                        <span className="text-steel">
                          Revision {e.revision}
                          {e.customerNote && <span className="text-muted-foreground"> — &ldquo;{e.customerNote}&rdquo;</span>}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="tabular text-muted-foreground">{formatPKR(estimateTotal(e.items))}</span>
                          <EstimateStatus status={e.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          {/* Parts */}
          {(b.allocations.length > 0 || b.purchaseOrders.length > 0) && (
            <section className="panel p-5">
              <h2 className="eyebrow mb-3 flex items-center gap-1.5">
                <Package className="size-3" /> Parts for this job
              </h2>
              {b.allocations.length > 0 && (
                <ul className="divide-y divide-line/70">
                  {b.allocations.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-foreground">
                        {a.inventoryItem.name}
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">{a.inventoryItem.sku}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="tabular text-muted-foreground">×{a.qty}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-px text-[11px]",
                            a.status === "ALLOCATED" && "border-teal/30 text-teal",
                            a.status === "RESERVED" && "border-signal-cyan/30 text-signal-cyan",
                            a.status === "RELEASED" && "border-line text-muted-foreground",
                          )}
                        >
                          {a.status.toLowerCase()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {b.purchaseOrders.length > 0 && (
                <div className="mt-4 space-y-2">
                  {b.purchaseOrders.map((po) => (
                    <div key={po.id} className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-steel">
                          Purchase order{" "}
                          <span className="font-mono text-xs text-muted-foreground">{po.id.slice(-6).toUpperCase()}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{po.status.replace("_", " ").toLowerCase()}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {po.items.map((i) => `${i.name} ${i.qtyReceived}/${i.qtyOrdered}`).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* QC issues */}
          {b.issues.length > 0 && (
            <section className="panel p-5">
              <h2 className="eyebrow mb-3 flex items-center gap-1.5">
                <ShieldAlert className="size-3" /> Quality-check issues
              </h2>
              <ul className="space-y-2">
                {b.issues.map((i) => (
                  <li
                    key={i.id}
                    className={cn(
                      "rounded-lg border px-3 py-2.5",
                      i.resolved ? "border-line bg-surface-2/40" : "border-signal-red/30 bg-signal-red/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-medium", i.resolved ? "text-steel line-through" : "text-signal-red")}>
                        {i.title}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {i.resolved ? "resolved" : "open"} · {i.createdBy.name}
                      </span>
                    </div>
                    {i.description && <p className="mt-1 text-sm text-steel">{i.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          <section className="panel divide-y divide-line/70">
            <div className="p-4">
              <p className="eyebrow mb-2">Customer</p>
              <p className="text-sm text-foreground">{b.customer.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" /> {b.customer.email}
              </p>
              {b.customer.phone && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5" /> {b.customer.phone}
                </p>
              )}
            </div>
            <div className="p-4">
              <p className="eyebrow mb-2 flex items-center gap-1.5">
                <Car className="size-3" /> Vehicle
              </p>
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Plate</dt>
                <dd className="text-right font-mono text-foreground">{b.vehicle.plate}</dd>
                <dt className="text-muted-foreground">Model</dt>
                <dd className="text-right text-foreground">
                  {b.vehicle.make} {b.vehicle.model} {b.vehicle.year}
                </dd>
                {b.vehicle.color && (
                  <>
                    <dt className="text-muted-foreground">Colour</dt>
                    <dd className="text-right text-foreground">{b.vehicle.color}</dd>
                  </>
                )}
                {b.vehicle.mileage != null && (
                  <>
                    <dt className="text-muted-foreground">Mileage</dt>
                    <dd className="text-right text-foreground tabular">{b.vehicle.mileage.toLocaleString()} km</dd>
                  </>
                )}
              </dl>
            </div>
            {b.slot && (
              <div className="p-4">
                <p className="eyebrow mb-2">Appointment</p>
                <p className="text-sm text-foreground">{formatLongDay(b.slot.startsAt)}</p>
                <p className="text-sm text-muted-foreground">{formatTime(b.slot.startsAt)}</p>
              </div>
            )}
            <div className="p-4">
              <p className="eyebrow mb-2">Crew</p>
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Technician</dt>
                <dd className="text-right text-foreground">{b.assignedTech?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Parts</dt>
                <dd className="text-right text-foreground">{b.partsPerson?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">QC</dt>
                <dd className="text-right text-foreground">{b.qcInspector?.name ?? "—"}</dd>
              </dl>
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="eyebrow mb-3 flex items-center gap-1.5">
              <History className="size-3" /> Service history · {b.vehicle.plate}
            </h2>
            {history.length ? (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/pos/${shopId}/bookings/${h.id}`}
                      className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{h.serviceNames.join(", ")}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(h.createdAt)} · <span className="font-mono">{h.code}</span>
                          {h.issues.length > 0 && " · had QC rework"}
                        </span>
                      </span>
                      <StatusBadge status={h.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">First visit for this vehicle at this shop.</p>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="eyebrow mb-4">Activity · audit log</h2>
            <Timeline events={b.timeline} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function EstimateStatus({ status }: { status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" }) {
  const map = {
    DRAFT: "border-line text-muted-foreground",
    SENT: "border-amber/30 text-amber",
    APPROVED: "border-teal/30 text-teal",
    REJECTED: "border-signal-red/30 text-signal-red",
  } as const;
  return (
    <span className={cn("rounded-full border px-2 py-px text-[11px] lowercase", map[status])}>
      {status === "SENT" ? "awaiting customer" : status.toLowerCase()}
    </span>
  );
}
