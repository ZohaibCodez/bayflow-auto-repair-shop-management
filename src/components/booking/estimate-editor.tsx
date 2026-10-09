"use client";

import { useState } from "react";
import { Package, Plus, Trash2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { EstimateItemInput } from "@/server/services/workflow";

export type InventoryOption = { id: string; sku: string; name: string; qtyOnHand: number; unitCost: number };
export type DraftLine = {
  kind: "PART" | "LABOR";
  inventoryItemId?: string | null;
  name?: string;
  qty: number;
  unitCost: number;
};

type Row = DraftLine & { key: number };
let seq = 0;
const withKey = (l: DraftLine): Row => ({ ...l, key: ++seq });

export function toItems(rows: DraftLine[]): EstimateItemInput[] {
  return rows.map((r) =>
    r.kind === "PART"
      ? { kind: "PART", inventoryItemId: r.inventoryItemId ?? "", qty: r.qty, unitCost: r.unitCost }
      : { kind: "LABOR", name: r.name ?? "", qty: r.qty, unitCost: r.unitCost },
  );
}

/**
 * Itemised estimate editor: parts come from the shop's inventory (so shortages are
 * computed automatically later), labour is free text. Live totals.
 */
export function EstimateEditor({
  inventory,
  initial,
  children,
}: {
  inventory: InventoryOption[];
  initial: DraftLine[];
  children: (lines: DraftLine[], valid: boolean) => React.ReactNode;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length ? initial.map(withKey) : [withKey({ kind: "LABOR", name: "", qty: 1, unitCost: 0 })],
  );
  const byId = new Map(inventory.map((i) => [i.id, i]));

  const update = (key: number, patch: Partial<DraftLine>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

  const total = rows.reduce((s, r) => s + (r.qty || 0) * (r.unitCost || 0), 0);
  const valid =
    rows.length > 0 &&
    rows.every((r) => (r.kind === "PART" ? !!r.inventoryItemId : !!r.name?.trim()) && r.qty >= 1 && r.unitCost >= 0);

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_72px_110px_100px_32px] gap-2 px-1 sm:grid">
        <span className="eyebrow">Item</span>
        <span className="eyebrow text-right">Qty</span>
        <span className="eyebrow text-right">Unit (PKR)</span>
        <span className="eyebrow text-right">Line</span>
        <span />
      </div>

      <ul className="space-y-2">
        {rows.map((r) => {
          const inv = r.inventoryItemId ? byId.get(r.inventoryItemId) : undefined;
          const short = r.kind === "PART" && inv && inv.qtyOnHand < r.qty;
          return (
            <li
              key={r.key}
              className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line bg-surface-2/60 p-2 sm:grid-cols-[1fr_72px_110px_100px_32px] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
            >
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-md",
                    r.kind === "PART" ? "bg-signal-cyan/10 text-signal-cyan" : "bg-signal-violet/10 text-signal-violet",
                  )}
                  title={r.kind === "PART" ? "Part" : "Labour"}
                >
                  {r.kind === "PART" ? <Package className="size-4" /> : <Wrench className="size-4" />}
                </span>
                {r.kind === "PART" ? (
                  <NativeSelect
                    className="flex-1"
                    value={r.inventoryItemId ?? ""}
                    onChange={(e) => {
                      const item = byId.get(e.target.value);
                      update(r.key, { inventoryItemId: e.target.value, unitCost: item?.unitCost ?? r.unitCost });
                    }}
                    aria-label="Part"
                  >
                    <option value="">Choose a part…</option>
                    {inventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} — {i.qtyOnHand > 0 ? `${i.qtyOnHand} in stock` : "out of stock"}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    className="h-9 flex-1"
                    placeholder="Labour, e.g. Replace ignition coil"
                    value={r.name ?? ""}
                    onChange={(e) => update(r.key, { name: e.target.value })}
                    aria-label="Labour description"
                  />
                )}
              </div>
              <Input
                type="number"
                min={1}
                className="h-9 text-right tabular"
                value={r.qty}
                onChange={(e) => update(r.key, { qty: Math.max(0, Math.floor(Number(e.target.value))) })}
                aria-label="Quantity"
              />
              <Input
                type="number"
                min={0}
                step={50}
                className="h-9 text-right tabular"
                value={r.unitCost}
                onChange={(e) => update(r.key, { unitCost: Math.max(0, Math.floor(Number(e.target.value))) })}
                aria-label="Unit cost"
              />
              <span className="self-center text-right text-sm text-steel tabular">
                {formatPKR(r.qty * r.unitCost)}
              </span>
              <button
                type="button"
                onClick={() => remove(r.key)}
                className="grid size-8 place-items-center justify-self-end rounded-md text-muted-foreground transition-colors hover:bg-signal-red/10 hover:text-signal-red"
                aria-label="Remove line"
              >
                <Trash2 className="size-4" />
              </button>
              {short && (
                <p className="col-span-2 text-xs text-amber sm:col-span-5 sm:pl-10">
                  Only {inv!.qtyOnHand} in stock — the parts desk will order the rest.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, withKey({ kind: "PART", inventoryItemId: "", qty: 1, unitCost: 0 })])}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs text-steel transition-colors hover:border-signal-cyan/40 hover:text-signal-cyan"
          >
            <Plus className="size-3.5" /> Part
          </button>
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, withKey({ kind: "LABOR", name: "", qty: 1, unitCost: 0 })])}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs text-steel transition-colors hover:border-signal-violet/40 hover:text-signal-violet"
          >
            <Plus className="size-3.5" /> Labour
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Total <span className="ml-2 font-display-md text-xl text-foreground tabular">{formatPKR(total)}</span>
        </p>
      </div>

      {children(rows, valid)}
    </div>
  );
}
