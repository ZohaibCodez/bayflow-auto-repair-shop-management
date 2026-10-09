import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { hasShopRole, requireShopAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";
import { getPurchaseOrders } from "@/server/queries/shop";
import { EmptyState, PageHeader } from "@/components/pos/page-header";
import { ReceiveForm } from "@/components/booking/action-panel";

const TONE = {
  ORDERED: "border-amber/30 text-amber",
  PARTIALLY_RECEIVED: "border-signal-cyan/30 text-signal-cyan",
  RECEIVED: "border-teal/30 text-teal",
} as const;

export default async function PurchaseOrdersPage({ params }: PageProps<"/pos/[shopId]/purchase-orders">) {
  const { shopId } = await params;
  const { access } = await guard(requireShopAccess(shopId, ["OWNER", "PARTS"]), `/pos/${shopId}/purchase-orders`);
  const orders = await getPurchaseOrders(shopId);
  const open = orders.filter((o) => o.status !== "RECEIVED");
  const done = orders.filter((o) => o.status === "RECEIVED");
  const canReceive = hasShopRole(access, ["OWNER", "PARTS"]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Parts"
        title="Purchase orders"
        description="Confirm deliveries as they arrive — stock goes up automatically, and parts ordered for a job are reserved for it straight away. Partial deliveries are fine."
      />

      <section className="space-y-3">
        <h2 className="eyebrow">Open · {open.length}</h2>
        {open.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {open.map((po) => (
              <div key={po.id} className="space-y-2">
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>
                    Raised {formatDateTime(po.createdAt)}
                    {po.booking && (
                      <>
                        {" "}for{" "}
                        <Link href={`/pos/${shopId}/bookings/${po.booking.id}`} className="font-mono text-amber hover:underline">
                          {po.booking.code}
                        </Link>
                      </>
                    )}
                  </span>
                  <span className={cn("rounded-full border px-2 py-px text-[11px] lowercase", TONE[po.status])}>
                    {po.status.replace("_", " ")}
                  </span>
                </div>
                {canReceive && <ReceiveForm shopId={shopId} po={po} />}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ShoppingCart className="size-6" />} title="No open orders">
            Orders appear here when a job is short of parts or you restock from Inventory.
          </EmptyState>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="eyebrow">Received</h2>
          <ul className="panel divide-y divide-line/70">
            {done.map((po) => (
              <li key={po.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-steel">
                  {po.items.map((i) => `${i.name} ×${i.qtyReceived}`).join(", ")}
                  {po.supplier && <span className="text-muted-foreground"> · {po.supplier}</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {po.booking ? `${po.booking.code} · ` : ""}
                  {formatDateTime(po.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
