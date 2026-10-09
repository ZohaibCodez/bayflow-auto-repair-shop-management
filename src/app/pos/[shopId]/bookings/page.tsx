import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { ClipboardList, Search } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { hasShopRole, requireShopAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listShopBookings, statusCounts } from "@/server/queries/bookings";
import { BookingRow } from "@/components/booking/booking-row";
import { EmptyState, PageHeader } from "@/components/pos/page-header";

const FILTERS: { key: string; label: string; statuses: BookingStatus[] }[] = [
  {
    key: "active",
    label: "Active",
    statuses: [
      "PENDING",
      "CONFIRMED",
      "ASSIGNED",
      "INSPECTING",
      "ESTIMATE_REVIEW",
      "AWAITING_CUSTOMER",
      "ESTIMATE_APPROVED",
      "ESTIMATE_REJECTED",
      "PARTS_PENDING",
      "PARTS_ORDERED",
      "PARTS_READY",
      "IN_REPAIR",
      "QC_PENDING",
      "QC_IN_PROGRESS",
      "READY_FOR_PICKUP",
    ],
  },
  { key: "new", label: "New", statuses: ["PENDING"] },
  { key: "inspection", label: "Inspection", statuses: ["CONFIRMED", "ASSIGNED", "INSPECTING", "ESTIMATE_REVIEW"] },
  { key: "customer", label: "With customer", statuses: ["AWAITING_CUSTOMER", "ESTIMATE_REJECTED"] },
  { key: "parts", label: "Parts", statuses: ["ESTIMATE_APPROVED", "PARTS_PENDING", "PARTS_ORDERED", "PARTS_READY"] },
  { key: "repair", label: "Repair & QC", statuses: ["IN_REPAIR", "QC_PENDING", "QC_IN_PROGRESS"] },
  { key: "ready", label: "Ready", statuses: ["READY_FOR_PICKUP"] },
  { key: "closed", label: "Closed", statuses: ["COMPLETED", "CANCELLED"] },
];

export default async function PosBookingsPage({ params, searchParams }: PageProps<"/pos/[shopId]/bookings">) {
  const { shopId } = await params;
  const sp = await searchParams;
  const { access, actor } = await guard(requireShopAccess(shopId), `/pos/${shopId}/bookings`);

  const filterKey = typeof sp.filter === "string" ? sp.filter : "active";
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const seesAll = hasShopRole(access, ["OWNER", "SERVICE_ADVISOR", "PARTS", "QC"]);

  const [rows, counts] = await Promise.all([
    listShopBookings(shopId, actor, { statuses: filter.statuses, q: q || undefined }),
    statusCounts(shopId, actor),
  ]);
  const countFor = (f: (typeof FILTERS)[number]) => f.statuses.reduce((s, st) => s + (counts[st] ?? 0), 0);
  const base = `/pos/${shopId}/bookings`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={seesAll ? "Front desk" : "Technician"}
        title={seesAll ? "Bookings" : "My jobs"}
        description={
          seesAll
            ? "Every booking in this shop. Filter by stage, or search by code, customer or plate."
            : "Only jobs assigned to you appear here."
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => {
            const active = f.key === filter.key;
            const n = countFor(f);
            return (
              <Link
                key={f.key}
                href={`${base}?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                  active
                    ? "border-amber/40 bg-amber/10 text-amber"
                    : "border-line text-muted-foreground hover:border-steel/30 hover:text-foreground",
                )}
              >
                {f.label}
                <span className={cn("text-xs tabular", active ? "text-amber/80" : "text-muted-foreground/70")}>{n}</span>
              </Link>
            );
          })}
        </div>
        <form className="relative w-full lg:w-72" action={base}>
          <input type="hidden" name="filter" value={filter.key} />
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search code, customer, plate…"
            className="h-9 w-full rounded-lg border border-line bg-surface-2/60 pr-3 pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-amber/50"
          />
        </form>
      </div>

      {rows.length ? (
        <div className="panel divide-y divide-line/70 overflow-hidden">
          {rows.map((b) => (
            <BookingRow key={b.id} b={b} href={`${base}/${b.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<ClipboardList className="size-6" />} title="Nothing here">
          {q ? "No bookings match your search." : "No bookings at this stage right now."}
        </EmptyState>
      )}
    </div>
  );
}
