import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CalendarCheck,
  EyeOff,
  Headset,
  PartyPopper,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { guard } from "@/lib/page-guard";
import { hasShopRole, requireShopAccess, type ShopAccess } from "@/lib/rbac";
import { formatDateTime, formatElapsed, formatLongDay, formatTime } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import { STATUS_META } from "@/lib/booking/status-meta";
import { DESK_FOR, nextUp, STALL_HOURS } from "@/lib/booking/queue";
import { listShopBookings, type BookingRow } from "@/server/queries/bookings";
import { isShopListed } from "@/server/queries/shop";
import { estimateTotal } from "@/components/booking/estimate-view";
import { Attention, type AttentionItem } from "@/components/pos/attention";
import { FloorBoard, type FloorCar } from "@/components/pos/floor-board";
import { MetricBand, type Metric } from "@/components/pos/metric-band";
import { NextUp, type NextUpItem } from "@/components/pos/next-up";
import { QuickActions, type QuickAction } from "@/components/pos/quick-actions";
import { ShopClock } from "@/components/pos/shop-clock";
import { Odometer } from "@/components/number-reel";

/** How many jobs the queue shows before it points at the full list. */
const QUEUE_SHOWN = 5;

const greeting = () => {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", timeZone: "Asia/Karachi" }).format(
      new Date(),
    ),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const vehicleName = (v: BookingRow["vehicle"]) => `${v.make} ${v.model}`;

export default async function PosHome({ params, searchParams }: PageProps<"/pos/[shopId]">) {
  const { shopId } = await params;
  const sp = await searchParams;
  const { user, access, actor } = await guard(requireShopAccess(shopId), `/pos/${shopId}`);
  const href = (id: string) => `/pos/${shopId}/bookings/${id}`;
  const now = new Date();

  const canSeeParts = hasShopRole(access, ["OWNER", "PARTS"]);
  const canSeeCalls = hasShopRole(access, ["OWNER", "SERVICE_ADVISOR"]);

  const [rows, listed, lowStockCount, openPOCount, openTaskCount] = await Promise.all([
    listShopBookings(shopId, actor, { take: 300 }),
    access.isOwner ? isShopListed(shopId) : Promise.resolve(true),
    canSeeParts
      ? prisma.inventoryItem
          .findMany({ where: { shopId }, select: { qtyOnHand: true, reorderLevel: true } })
          .then((rows) => rows.filter((i) => i.qtyOnHand <= i.reorderLevel).length)
      : Promise.resolve(0),
    canSeeParts
      ? prisma.purchaseOrder.count({ where: { shopId, status: { not: "RECEIVED" } } })
      : Promise.resolve(0),
    canSeeCalls
      ? prisma.aiTask.count({ where: { shopId, done: false } })
      : Promise.resolve(0),
  ]);

  const live = rows.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const queue = nextUp(rows, actor, now);
  const firstName = user.name.split(" ")[0];
  const onlyTechnician =
    hasShopRole(access, ["TECHNICIAN"]) &&
    !access.isOwner &&
    !hasShopRole(access, ["SERVICE_ADVISOR", "PARTS", "QC"]);

  // ---- The headline is the answer, not a greeting -------------------------
  const waiting = queue.length;
  const headlineTail = waiting
    ? ` job${waiting === 1 ? "" : "s"} need${waiting === 1 ? "s" : ""} you`
    : null;
  const qcPendingCount = rows.filter((b) => b.status === "QC_PENDING").length;

  const actions = quickActionsFor(shopId, access, {
    queueCount: waiting,
    qcPendingCount,
    lowStockCount,
    openPOCount,
    openTaskCount,
  });

  const cars: FloorCar[] = live.map((b) => ({
    id: b.id,
    code: b.code,
    href: href(b.id),
    status: b.status,
    plate: b.vehicle.plate,
    vehicle: vehicleName(b.vehicle),
    customer: b.customer.name,
    sinceIso: b.updatedAt.toISOString(),
    sinceLabel: formatElapsed(b.updatedAt, now),
    stalled: isStalled(b, now),
    hasIssue: b.issues.length > 0,
  }));

  const queueItems: NextUpItem[] = queue.slice(0, QUEUE_SHOWN).map(({ booking: b, action }) => ({
    id: b.id,
    href: href(b.id),
    action,
    vehicle: vehicleName(b.vehicle),
    plate: b.vehicle.plate,
    customer: b.customer.name,
    slotLabel: b.slot ? formatDateTime(b.slot.startsAt) : null,
    sinceIso: b.updatedAt.toISOString(),
    sinceLabel: formatElapsed(b.updatedAt, now),
    stalled: isStalled(b, now),
    hasIssue: b.issues.length > 0,
    tone: STATUS_META[b.status].tone,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {sp.welcome === "1" && (
        <div className="panel flex items-start gap-3 border-teal/30 p-4">
          <PartyPopper className="mt-0.5 size-5 text-teal" />
          <div>
            <p className="text-sm font-medium text-foreground">Your shop is live on BayFlow.</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Next:{" "}
              <Link href={`/pos/${shopId}/team`} className="text-amber-ink hover:underline">
                add your team
              </Link>
              , review your{" "}
              <Link href={`/pos/${shopId}/services`} className="text-amber-ink hover:underline">
                services
              </Link>{" "}
              and stock up the{" "}
              <Link href={`/pos/${shopId}/inventory`} className="text-amber-ink hover:underline">
                inventory
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {!listed && (
        <div className="panel flex items-start gap-3 border-amber/30 p-4">
          <EyeOff className="mt-0.5 size-5 text-amber" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Not in the public shop directory yet
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Customers will find this shop once it has at least one{" "}
              <Link href={`/pos/${shopId}/team`} className="text-amber-ink hover:underline">
                active technician
              </Link>{" "}
              and one{" "}
              <Link href={`/pos/${shopId}/services`} className="text-amber-ink hover:underline">
                active service
              </Link>
              . Direct booking links already work.
            </p>
          </div>
        </div>
      )}

      {/* ---- Command line -------------------------------------------------
          What needs doing, then where you are and what time it is there.
          The count rolls in on an odometer reel — the same instrument the
          landing page's live strip uses — rather than just appearing, so
          the one number that matters most on the page reads as live data. */}
      <header
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        style={{ animation: "hero-in .5s cubic-bezier(.16,1,.3,1) backwards" }}
      >
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            {waiting ? (
              <>
                <Odometer value={waiting} />
                {headlineTail}
              </>
            ) : (
              "You're all clear"
            )}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
            <span>
              {greeting()}, {firstName}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <ShopClock initial={formatTime(now)} />
            <span className="text-muted-foreground/40">·</span>
            <span>{formatLongDay(now)}</span>
          </p>
        </div>
        <Link
          href={`/pos/${shopId}/bookings`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-line px-3 text-sm text-steel transition-colors hover:border-amber/40 hover:text-foreground sm:self-auto"
        >
          {onlyTechnician ? "All my jobs" : "All bookings"}
          <ArrowRight className="size-4" />
        </Link>
      </header>

      {actions.length > 1 && (
        <div style={{ animation: "hero-in .5s cubic-bezier(.16,1,.3,1) 60ms backwards" }}>
          <QuickActions actions={actions} />
        </div>
      )}

      <div style={{ animation: "hero-in .5s cubic-bezier(.16,1,.3,1) 110ms backwards" }}>
        <NextUp
          items={queueItems}
          total={queue.length}
          allHref={`/pos/${shopId}/bookings`}
          emptyHint={
            live.length
              ? `${live.length} car${live.length === 1 ? "" : "s"} still in the shop — they're waiting on somebody else.`
              : "No cars in the shop right now."
          }
        />
      </div>

      {/* ---- The floor ---------------------------------------------------
          Every live car in the bay it is standing in. A job that changes
          status travels across the board on the next refresh. */}
      <section
        className="space-y-3"
        style={{ animation: "hero-in .5s cubic-bezier(.16,1,.3,1) 160ms backwards" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display-md text-base text-foreground">
            {onlyTechnician ? "Your cars" : "The floor"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {live.length
              ? `${live.length} car${live.length === 1 ? "" : "s"} in the shop`
              : "Nothing in the bays"}
          </p>
        </div>
        {live.length ? (
          <FloorBoard cars={cars} />
        ) : (
          <p className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted-foreground">
            Every car has been collected. New bookings land in the first bay.
          </p>
        )}
      </section>

      {access.isOwner && (
        <div style={{ animation: "hero-in .5s cubic-bezier(.16,1,.3,1) 210ms backwards" }}>
          <OwnerNumbers shopId={shopId} live={live} />
        </div>
      )}

      <div style={{ animation: "hero-in .5s cubic-bezier(.16,1,.3,1) 260ms backwards" }}>
        <ShopAttention
          shopId={shopId}
          rows={rows}
          canSeeStock={hasShopRole(access, ["OWNER", "PARTS"])}
        />
      </div>
    </div>
  );
}

/** The real next moves for this role — only routes the viewer can actually open. */
function quickActionsFor(
  shopId: string,
  access: ShopAccess,
  counts: {
    queueCount: number;
    qcPendingCount: number;
    lowStockCount: number;
    openPOCount: number;
    openTaskCount: number;
  },
): QuickAction[] {
  const base = `/pos/${shopId}`;
  const actions: QuickAction[] = [];
  const isTechOnly =
    hasShopRole(access, ["TECHNICIAN"]) &&
    !access.isOwner &&
    !hasShopRole(access, ["SERVICE_ADVISOR", "PARTS", "QC"]);

  actions.push({
    href: `${base}/bookings`,
    label: isTechOnly ? "My jobs" : "Bookings",
    hint: counts.queueCount ? `${counts.queueCount} waiting on you` : "All caught up",
    icon: <CalendarCheck />,
    badge: counts.queueCount,
  });

  if (hasShopRole(access, ["OWNER", "QC"])) {
    actions.push({
      href: `${base}/qc`,
      label: "QC queue",
      hint: counts.qcPendingCount ? `${counts.qcPendingCount} waiting` : "Queue is clear",
      icon: <ShieldCheck />,
      badge: counts.qcPendingCount,
    });
  }

  if (hasShopRole(access, ["OWNER", "PARTS"])) {
    actions.push({
      href: `${base}/inventory`,
      label: "Inventory",
      hint: counts.lowStockCount
        ? `${counts.lowStockCount} at reorder level`
        : "Stock levels are fine",
      icon: <Boxes />,
      badge: counts.lowStockCount,
    });
    actions.push({
      href: `${base}/purchase-orders`,
      label: "Purchase orders",
      hint: counts.openPOCount ? `${counts.openPOCount} open` : "Nothing on order",
      icon: <ShoppingCart />,
      badge: counts.openPOCount,
    });
  }

  if (hasShopRole(access, ["OWNER", "SERVICE_ADVISOR"])) {
    actions.push({
      href: `${base}/calls`,
      label: "Calls & AI",
      hint: counts.openTaskCount ? `${counts.openTaskCount} follow-up` : "No open follow-ups",
      icon: <Headset />,
      badge: counts.openTaskCount,
    });
  }

  return actions;
}

/** Sitting on a person (not the customer) for longer than the stall threshold. */
function isStalled(b: BookingRow, now: Date): boolean {
  const desk = DESK_FOR[b.status];
  if (desk === null || desk === "CUSTOMER") return false;
  return now.getTime() - b.updatedAt.getTime() > STALL_HOURS * 3_600_000;
}

async function OwnerNumbers({ shopId, live }: { shopId: string; live: BookingRow[] }) {
  const [inventory, qcFails, qcPasses, completed] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { shopId },
      select: { qtyOnHand: true, reorderLevel: true, unitCost: true },
    }),
    prisma.issue.count({ where: { booking: { shopId } } }),
    prisma.bookingEvent.count({
      where: { booking: { shopId }, fromStatus: "QC_IN_PROGRESS", toStatus: "READY_FOR_PICKUP" },
    }),
    // Completed jobs: revenue (approved estimate) and turnaround (booked → collected).
    prisma.bookingEvent.findMany({
      where: { booking: { shopId }, toStatus: "COMPLETED" },
      select: {
        createdAt: true,
        booking: {
          select: {
            createdAt: true,
            estimates: {
              where: { status: "APPROVED" },
              select: { items: { select: { qty: true, unitCost: true } } },
            },
          },
        },
      },
    }),
  ]);

  const revenue = completed.reduce(
    (sum, e) => sum + e.booking.estimates.reduce((t, est) => t + estimateTotal(est.items), 0),
    0,
  );
  const turnaroundH = completed.length
    ? completed.reduce((s, e) => s + (+e.createdAt - +e.booking.createdAt), 0) /
      completed.length /
      3_600_000
    : null;
  const pipeline = live.reduce(
    (sum, b) => sum + (b.estimates[0] ? estimateTotal(b.estimates[0].items) : 0),
    0,
  );
  const qcRuns = qcFails + qcPasses;
  const lowStock = inventory.filter((i) => i.qtyOnHand <= i.reorderLevel).length;

  const stockValue = inventory.reduce((sum, i) => sum + i.qtyOnHand * i.unitCost, 0);
  const qcPassPct = qcRuns ? Math.round((qcPasses / qcRuns) * 100) : null;
  const turnaroundUnit: "hours" | "days" | null =
    turnaroundH == null ? null : turnaroundH < 48 ? "hours" : "days";

  // `raw` + `unit` play the figure back as a count-up instead of a jump cut —
  // `unit` must format `raw` to exactly `value` (MetricBand owns the actual
  // formatter, since a function can't be passed to a Client Component as a
  // prop), so the animation can never show a number this tile doesn't also
  // state statically.
  const metrics: Metric[] = [
    {
      label: "Work in the pipeline",
      value: formatPKR(pipeline),
      raw: pipeline,
      unit: "pkr",
      hint: `${live.length} active job${live.length === 1 ? "" : "s"}`,
    },
    {
      label: "Revenue collected",
      value: formatPKR(revenue),
      raw: revenue,
      unit: "pkr",
      tone: "teal",
      hint: `${completed.length} job${completed.length === 1 ? "" : "s"} completed`,
    },
    {
      label: "Average turnaround",
      value:
        turnaroundH == null
          ? "—"
          : turnaroundH < 48
            ? `${turnaroundH.toFixed(1)} h`
            : `${(turnaroundH / 24).toFixed(1)} d`,
      raw: turnaroundH == null ? undefined : turnaroundUnit === "hours" ? turnaroundH : turnaroundH / 24,
      unit: turnaroundUnit ?? undefined,
      hint: "Booked to collected",
    },
    {
      label: "QC pass rate",
      value: qcPassPct == null ? "—" : `${qcPassPct}%`,
      raw: qcPassPct ?? undefined,
      unit: qcPassPct == null ? undefined : "percent",
      tone: qcRuns && qcFails / qcRuns > 0.3 ? "red" : "default",
      hint: `${qcFails} fail${qcFails === 1 ? "" : "s"} of ${qcRuns} check${qcRuns === 1 ? "" : "s"}`,
    },
    {
      label: "Stock on the shelf",
      value: formatPKR(stockValue),
      raw: stockValue,
      unit: "pkr",
      hint: `${inventory.length} part${inventory.length === 1 ? "" : "s"}, ${lowStock} at reorder level`,
      tone: lowStock ? "amber" : "default",
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="font-display-md text-base text-foreground">The shop</h2>
      <MetricBand metrics={metrics} />
    </section>
  );
}

/**
 * QC failures, declined estimates and low stock — one list, or nothing at all.
 *
 * Scoped to what this viewer may already see: issues are looked up by the booking
 * ids in `rows` (which `listShopBookings` has filtered for them), so a technician
 * never learns about a failure on somebody else's car. Stock is for the people
 * who can act on it.
 */
async function ShopAttention({
  shopId,
  rows,
  canSeeStock,
}: {
  shopId: string;
  rows: BookingRow[];
  canSeeStock: boolean;
}) {
  const visibleIds = rows.map((b) => b.id);
  const [issues, stock] = await Promise.all([
    visibleIds.length
      ? prisma.issue.findMany({
          where: { resolved: false, bookingId: { in: visibleIds } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            bookingId: true,
            booking: { select: { vehicle: { select: { plate: true, make: true, model: true } } } },
          },
        })
      : [],
    canSeeStock
      ? prisma.inventoryItem.findMany({
          where: { shopId },
          orderBy: { qtyOnHand: "asc" },
          select: { id: true, name: true, qtyOnHand: true, reorderLevel: true },
        })
      : [],
  ]);

  const low = stock.filter((i) => i.qtyOnHand <= i.reorderLevel);

  const items: AttentionItem[] = [
    ...issues.map((i) => ({
      id: `issue-${i.id}`,
      kind: "qc" as const,
      title: i.title,
      detail: `Quality check failed — ${i.booking.vehicle.make} ${i.booking.vehicle.model} ${i.booking.vehicle.plate}`,
      href: `/pos/${shopId}/bookings/${i.bookingId}`,
    })),
    ...rows
      .filter((b) => b.status === "ESTIMATE_REJECTED")
      .map((b) => ({
        id: `declined-${b.id}`,
        kind: "declined" as const,
        title: "Customer declined the estimate",
        detail: `${b.vehicle.make} ${b.vehicle.model} ${b.vehicle.plate} — revise it or cancel`,
        href: `/pos/${shopId}/bookings/${b.id}`,
      })),
    ...(low.length
      ? [
          {
            id: "low-stock",
            kind: "stock" as const,
            title: `${low.length} part${low.length === 1 ? "" : "s"} at or below reorder level`,
            detail: low
              .slice(0, 4)
              .map((i) => `${i.name} (${i.qtyOnHand}/${i.reorderLevel})`)
              .join(", "),
            href: `/pos/${shopId}/inventory`,
          },
        ]
      : []),
  ];

  return <Attention items={items} />;
}
