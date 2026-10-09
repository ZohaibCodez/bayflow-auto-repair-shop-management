import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { requireShopAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/money";
import { formatRelative } from "@/lib/time";
import { getInventory, getRecentMovements } from "@/server/queries/shop";
import { PageHeader, Stat } from "@/components/pos/page-header";
import { AddPartForm, RestockForm } from "@/components/pos/inventory-forms";

const REASON: Record<string, string> = {
  RECEIVE: "Received",
  RESERVE: "Reserved",
  RELEASE: "Released",
  ADJUST: "Adjusted",
};

export default async function InventoryPage({ params }: PageProps<"/pos/[shopId]/inventory">) {
  const { shopId } = await params;
  await guard(requireShopAccess(shopId, ["OWNER", "PARTS"]), `/pos/${shopId}/inventory`);
  const [items, movements] = await Promise.all([getInventory(shopId), getRecentMovements(shopId)]);

  const rows = items.map((i) => {
    const reserved = i.allocations.reduce((s, a) => s + a.qty, 0);
    const onOrder = i.poItems.reduce((s, p) => s + p.qtyOrdered - p.qtyReceived, 0);
    return { ...i, reserved, onOrder, low: i.qtyOnHand <= i.reorderLevel };
  });
  const low = rows.filter((r) => r.low);
  const value = rows.reduce((s, r) => s + r.qtyOnHand * r.unitCost, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Parts"
        title="Inventory"
        description="Stock on the shelf for this shop only. Reserving parts for a job takes them off the shelf; cancelling a job puts them back."
        actions={
          <>
            <AddPartForm shopId={shopId} />
            <RestockForm
              shopId={shopId}
              items={low.map((r) => ({
                id: r.id,
                name: r.name,
                sku: r.sku,
                suggested: Math.max(1, r.reorderLevel * 2 - r.qtyOnHand - r.onOrder),
              }))}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Parts" value={rows.length} />
        <Stat label="Low or out" value={low.length} tone={low.length ? "amber" : "default"} />
        <Stat label="Reserved for jobs" value={rows.reduce((s, r) => s + r.reserved, 0)} />
        <Stat label="Stock value" value={formatPKR(value)} />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-normal [&>th]:text-muted-foreground">
              <th>SKU</th>
              <th>Part</th>
              <th className="text-right">On shelf</th>
              <th className="text-right">Reserved</th>
              <th className="text-right">On order</th>
              <th className="text-right">Reorder at</th>
              <th className="text-right">Unit cost</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((r) => (
              <tr key={r.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-surface-2/40">
                <td className="font-mono text-xs text-muted-foreground">{r.sku}</td>
                <td className="text-foreground">{r.name}</td>
                <td className={cn("text-right tabular", r.qtyOnHand === 0 ? "text-signal-red" : "text-foreground")}>
                  {r.qtyOnHand}
                </td>
                <td className="text-right text-steel tabular">{r.reserved || "—"}</td>
                <td className="text-right text-steel tabular">{r.onOrder || "—"}</td>
                <td className="text-right text-muted-foreground tabular">{r.reorderLevel}</td>
                <td className="text-right text-steel tabular">{formatPKR(r.unitCost)}</td>
                <td className="text-right">
                  {r.qtyOnHand === 0 ? (
                    <span className="rounded-full border border-signal-red/30 px-2 py-px text-[11px] text-signal-red">out</span>
                  ) : r.low ? (
                    <span className="rounded-full border border-amber/30 px-2 py-px text-[11px] text-amber">low</span>
                  ) : (
                    <span className="rounded-full border border-teal/30 px-2 py-px text-[11px] text-teal">ok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <h2 className="eyebrow">Stock ledger · latest movements</h2>
        {movements.length ? (
          <ul className="panel divide-y divide-line/70">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md",
                    m.delta > 0 ? "bg-teal/10 text-teal" : "bg-signal-cyan/10 text-signal-cyan",
                  )}
                >
                  {m.delta > 0 ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {REASON[m.reason]} · {m.inventoryItem.name}
                  {m.booking && (
                    <Link href={`/pos/${shopId}/bookings/${m.booking.id}`} className="ml-2 font-mono text-xs text-amber hover:underline">
                      {m.booking.code}
                    </Link>
                  )}
                </span>
                <span className={cn("tabular", m.delta > 0 ? "text-teal" : "text-steel")}>
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
                <span className="hidden w-32 text-right text-xs text-muted-foreground sm:block">
                  {m.actor?.name ?? "—"} · {formatRelative(m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No stock movements yet.</p>
        )}
      </section>
    </div>
  );
}
