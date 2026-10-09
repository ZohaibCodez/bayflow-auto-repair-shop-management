import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { ArrowRight, Boxes, EyeOff, PartyPopper, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { guard } from "@/lib/page-guard";
import { hasShopRole, requireShopAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatLongDay } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import { PHASES, STATUS_META, TONE_CLASS } from "@/lib/booking/status-meta";
import { listShopBookings, statusCounts, type BookingRow } from "@/server/queries/bookings";
import { isShopListed } from "@/server/queries/shop";
import { JobLane } from "@/components/booking/job-lane";
import { PageHeader, Stat } from "@/components/pos/page-header";
import { estimateTotal } from "@/components/booking/estimate-view";

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", timeZone: "Asia/Karachi" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default async function PosHome({ params, searchParams }: PageProps<"/pos/[shopId]">) {
  const { shopId } = await params;
  const sp = await searchParams;
  const { user, access, actor } = await guard(requireShopAccess(shopId), `/pos/${shopId}`);
  const href = (id: string) => `/pos/${shopId}/bookings/${id}`;

  const [rows, listed] = await Promise.all([
    listShopBookings(shopId, actor, { take: 300 }),
    access.isOwner ? isShopListed(shopId) : Promise.resolve(true),
  ]);
  const by = (...s: BookingStatus[]) => rows.filter((b) => s.includes(b.status));
  const mine = (key: "assignedTechId" | "partsPersonId") => (b: BookingRow) => b[key] === user.id;

  const isOwner = access.isOwner;
  const isSA = hasShopRole(access, ["SERVICE_ADVISOR"]);
  const isTech = hasShopRole(access, ["TECHNICIAN"]);
  const isParts = hasShopRole(access, ["PARTS"]);
  const isQC = hasShopRole(access, ["QC"]);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {sp.welcome === "1" && (
        <div className="panel flex items-start gap-3 border-teal/30 p-4">
          <PartyPopper className="mt-0.5 size-5 text-teal" />
          <div>
            <p className="text-sm font-medium text-foreground">Your shop is live on BayFlow.</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Next: <Link href={`/pos/${shopId}/team`} className="text-amber hover:underline">add your team</Link>,{" "}
              review your <Link href={`/pos/${shopId}/services`} className="text-amber hover:underline">services</Link> and stock up the{" "}
              <Link href={`/pos/${shopId}/inventory`} className="text-amber hover:underline">inventory</Link>.
            </p>
          </div>
        </div>
      )}

      {!listed && (
        <div className="panel flex items-start gap-3 border-amber/30 p-4">
          <EyeOff className="mt-0.5 size-5 text-amber" />
          <div>
            <p className="text-sm font-medium text-foreground">Not in the public shop directory yet</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Customers will find this shop once it has at least one{" "}
              <Link href={`/pos/${shopId}/team`} className="text-amber hover:underline">active technician</Link> and one{" "}
              <Link href={`/pos/${shopId}/services`} className="text-amber hover:underline">active service</Link>. Direct
              booking links already work.
            </p>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow={formatLongDay(new Date())}
        title={`${greeting()}, ${firstName}`}
        description={`Here's what's moving through ${access.shop.name} right now.`}
        actions={
          <Link
            href={`/pos/${shopId}/bookings`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-steel transition-colors hover:border-amber/40 hover:text-foreground"
          >
            {isTech && !isOwner && !isSA ? "All my jobs" : "All bookings"} <ArrowRight className="size-4" />
          </Link>
        }
      />

      {isOwner && <OwnerOverview shopId={shopId} rows={rows} />}

      {(isSA || isOwner) && (
        <RoleSection title="Front desk" subtitle="Bookings waiting on the service advisor">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <JobLane title="New bookings" hint="Confirm or decline" rows={by("PENDING")} hrefFor={href} accent />
            <JobLane title="Assign a technician" hint="Confirmed, no tech yet" rows={by("CONFIRMED")} hrefFor={href} accent />
            <JobLane title="Review estimates" hint="Check & send to customer" rows={by("ESTIMATE_REVIEW")} hrefFor={href} accent />
            <JobLane title="Customer declined" hint="Revise or cancel" rows={by("ESTIMATE_REJECTED")} hrefFor={href} accent />
            <JobLane title="Hand to parts" hint="Estimate approved" rows={by("ESTIMATE_APPROVED")} hrefFor={href} accent />
            <JobLane title="Ready for pick-up" hint="Notify & complete" rows={by("READY_FOR_PICKUP")} hrefFor={href} accent />
          </div>
        </RoleSection>
      )}

      {isTech && (
        <RoleSection title="Your bay" subtitle="Jobs assigned to you">
          <div className="grid gap-4 md:grid-cols-3">
            <JobLane
              title="To inspect"
              hint="Inspect & build the estimate"
              rows={by("ASSIGNED", "INSPECTING").filter(mine("assignedTechId"))}
              hrefFor={href}
              accent
            />
            <JobLane
              title="To repair"
              hint="Parts allocated — includes QC rework"
              rows={by("IN_REPAIR").filter(mine("assignedTechId"))}
              hrefFor={href}
              accent
            />
            <JobLane
              title="Elsewhere in the shop"
              hint="Waiting on the advisor, customer, parts or QC"
              rows={rows.filter(
                (b) =>
                  b.assignedTechId === user.id &&
                  !["ASSIGNED", "INSPECTING", "IN_REPAIR", "COMPLETED", "CANCELLED"].includes(b.status),
              )}
              hrefFor={href}
            />
          </div>
        </RoleSection>
      )}

      {isParts && (
        <RoleSection title="Parts desk" subtitle="Jobs handed to you">
          <div className="grid gap-4 md:grid-cols-3">
            <JobLane title="Check stock" hint="Reserve or order" rows={by("PARTS_PENDING").filter(mine("partsPersonId"))} hrefFor={href} accent />
            <JobLane title="On order" hint="Receive deliveries" rows={by("PARTS_ORDERED").filter(mine("partsPersonId"))} hrefFor={href} accent />
            <JobLane title="Ready to allocate" hint="Release to the technician" rows={by("PARTS_READY").filter(mine("partsPersonId"))} hrefFor={href} accent />
          </div>
          <LowStock shopId={shopId} />
        </RoleSection>
      )}

      {isQC && (
        <RoleSection title="Quality control" subtitle="Shared queue — first to pick locks the job">
          <div className="grid gap-4 md:grid-cols-2">
            <JobLane title="QC queue" hint="Pick a job to test" rows={by("QC_PENDING")} hrefFor={href} accent />
            <JobLane
              title="Testing now"
              hint="Jobs you picked"
              rows={by("QC_IN_PROGRESS").filter((b) => b.qcInspectorId === user.id)}
              hrefFor={href}
              accent
            />
          </div>
        </RoleSection>
      )}
    </div>
  );
}

function RoleSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display-md text-lg text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

async function OwnerOverview({ shopId, rows }: { shopId: string; rows: BookingRow[] }) {
  const [counts, team, inventory, qcFails, qcPasses, completedEvents] = await Promise.all([
    statusCounts(shopId),
    prisma.membership.groupBy({ by: ["role"], where: { shopId, active: true }, _count: { _all: true } }),
    prisma.inventoryItem.findMany({ where: { shopId }, select: { qtyOnHand: true, reorderLevel: true, unitCost: true } }),
    prisma.issue.count({ where: { booking: { shopId } } }),
    prisma.bookingEvent.count({ where: { booking: { shopId }, fromStatus: "QC_IN_PROGRESS", toStatus: "READY_FOR_PICKUP" } }),
    // Completed jobs: revenue (approved estimate) and turnaround (booked → collected).
    prisma.bookingEvent.findMany({
      where: { booking: { shopId }, toStatus: "COMPLETED" },
      select: {
        createdAt: true,
        booking: {
          select: {
            createdAt: true,
            estimates: { where: { status: "APPROVED" }, select: { items: { select: { qty: true, unitCost: true } } } },
          },
        },
      },
    }),
  ]);
  const revenue = completedEvents.reduce(
    (s, e) => s + e.booking.estimates.reduce((t, est) => t + estimateTotal(est.items), 0),
    0,
  );
  const turnaroundH = completedEvents.length
    ? completedEvents.reduce((s, e) => s + (+e.createdAt - +e.booking.createdAt), 0) / completedEvents.length / 3_600_000
    : null;

  const active = rows.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const pipelineValue = active.reduce((s, b) => s + (b.estimates[0] ? estimateTotal(b.estimates[0].items) : 0), 0);
  const lowStock = inventory.filter((i) => i.qtyOnHand <= i.reorderLevel).length;
  const stockValue = inventory.reduce((s, i) => s + i.qtyOnHand * i.unitCost, 0);
  const qcRuns = qcFails + qcPasses;

  const phaseCounts = PHASES.map((label, i) => ({
    label,
    count: (Object.keys(counts) as BookingStatus[])
      .filter((s) => STATUS_META[s].phase === i)
      .reduce((n, s) => n + (counts[s] ?? 0), 0),
    tone: TONE_CLASS[STATUS_META[(Object.keys(STATUS_META) as BookingStatus[]).find((s) => STATUS_META[s].phase === i)!].tone],
  }));
  const max = Math.max(1, ...phaseCounts.map((p) => p.count));
  const roleCount = (r: string) => team.find((t) => t.role === r)?._count._all ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Active jobs" value={active.length} hint={`${counts.COMPLETED ?? 0} completed`} />
        <Stat label="Awaiting customer" value={counts.AWAITING_CUSTOMER ?? 0} tone="amber" hint="Estimates out for approval" />
        <Stat label="Work in pipeline" value={formatPKR(pipelineValue)} hint="Latest estimates on active jobs" />
        <Stat label="Revenue" value={formatPKR(revenue)} tone="teal" hint={`${completedEvents.length} completed job${completedEvents.length === 1 ? "" : "s"}`} />
        <Stat
          label="Avg turnaround"
          value={turnaroundH == null ? "—" : turnaroundH < 48 ? `${turnaroundH.toFixed(1)} h` : `${(turnaroundH / 24).toFixed(1)} d`}
          hint="Booked → collected"
        />
        <Stat
          label="QC pass rate"
          value={qcRuns ? `${Math.round((qcPasses / qcRuns) * 100)}%` : "—"}
          tone={qcRuns && qcFails / qcRuns > 0.3 ? "red" : "default"}
          hint={`${qcFails} fail${qcFails === 1 ? "" : "s"} of ${qcRuns} checks`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="panel p-5">
          <h3 className="eyebrow mb-4">Bookings by stage</h3>
          <ul className="space-y-2.5">
            {phaseCounts.map((p) => (
              <li key={p.label} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className={cn("block h-full rounded-full", p.tone.dot)}
                    style={{ width: `${(p.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-right text-foreground tabular">{p.count}</span>
              </li>
            ))}
            <li className="grid grid-cols-[110px_1fr_32px] items-center gap-3 border-t border-line/70 pt-2.5 text-sm">
              <span className="text-muted-foreground">Cancelled</span>
              <span />
              <span className="text-right text-muted-foreground tabular">{counts.CANCELLED ?? 0}</span>
            </li>
          </ul>
        </section>

        <div className="grid gap-4">
          <Link href={`/pos/${shopId}/team`} className="panel group p-5 transition-colors hover:border-amber/30">
            <h3 className="eyebrow mb-3 flex items-center gap-1.5">
              <Users className="size-3" /> Team
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Advisors", "SERVICE_ADVISOR"],
                ["Techs", "TECHNICIAN"],
                ["QC", "QC"],
                ["Parts", "PARTS"],
              ].map(([label, role]) => (
                <div key={role}>
                  <p className="font-display-md text-2xl text-foreground tabular">{roleCount(role)}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </Link>
          <Link href={`/pos/${shopId}/inventory`} className="panel group p-5 transition-colors hover:border-amber/30">
            <h3 className="eyebrow mb-3 flex items-center gap-1.5">
              <Boxes className="size-3" /> Inventory
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display-md text-2xl text-foreground tabular">{inventory.length}</p>
                <p className="text-xs text-muted-foreground">Parts</p>
              </div>
              <div>
                <p className={cn("font-display-md text-2xl tabular", lowStock ? "text-amber" : "text-foreground")}>{lowStock}</p>
                <p className="text-xs text-muted-foreground">Low stock</p>
              </div>
              <div>
                <p className="font-display-md text-lg leading-8 text-foreground tabular">{formatPKR(stockValue).replace("PKR ", "")}</p>
                <p className="text-xs text-muted-foreground">Stock value</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

async function LowStock({ shopId }: { shopId: string }) {
  const items = await prisma.inventoryItem.findMany({ where: { shopId }, orderBy: { qtyOnHand: "asc" } });
  const low = items.filter((i) => i.qtyOnHand <= i.reorderLevel);
  if (!low.length) return null;
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">At or below reorder level</h3>
        <Link href={`/pos/${shopId}/inventory`} className="text-xs text-amber hover:underline">
          Restock →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {low.map((i) => (
          <span key={i.id} className="rounded-full border border-amber/30 bg-amber/5 px-2.5 py-1 text-xs text-steel">
            {i.name} <span className="text-amber tabular">{i.qtyOnHand}</span>
            <span className="text-muted-foreground">/{i.reorderLevel}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
