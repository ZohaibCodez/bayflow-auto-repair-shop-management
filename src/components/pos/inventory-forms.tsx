"use client";

import { useState } from "react";
import { PackagePlus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/components/use-action";
import { addInventoryItemAction, createRestockOrderAction } from "@/server/actions/shop";

export function AddPartForm({ shopId }: { shopId: string }) {
  const { pending, exec } = useAction();
  const [open, setOpen] = useState(false);
  const empty = { sku: "", name: "", qtyOnHand: "0", reorderLevel: "2", unitCost: "0" };
  const [f, setF] = useState(empty);

  if (!open) {
    return (
      <Button variant="outline" className="h-9" onClick={() => setOpen(true)}>
        <PackagePlus /> Add part
      </Button>
    );
  }
  return (
    <div className="panel w-full space-y-4 p-4">
      <p className="text-sm font-medium text-foreground">New part</p>
      <div className="grid gap-3 sm:grid-cols-5">
        {(
          [
            ["sku", "SKU", "text"],
            ["name", "Name", "text"],
            ["qtyOnHand", "Opening stock", "number"],
            ["reorderLevel", "Reorder level", "number"],
            ["unitCost", "Unit cost (PKR)", "number"],
          ] as const
        ).map(([k, label, type]) => (
          <div key={k} className={k === "name" ? "space-y-1.5 sm:col-span-1" : "space-y-1.5"}>
            <Label htmlFor={`part-${k}`} className="text-steel">
              {label}
            </Label>
            <Input
              id={`part-${k}`}
              type={type}
              min={type === "number" ? 0 : undefined}
              className="h-9"
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          className="h-9"
          disabled={pending}
          onClick={() =>
            exec(
              () =>
                addInventoryItemAction(shopId, {
                  sku: f.sku,
                  name: f.name,
                  qtyOnHand: Number(f.qtyOnHand),
                  reorderLevel: Number(f.reorderLevel),
                  unitCost: Number(f.unitCost),
                }),
              () => {
                setF(empty);
                setOpen(false);
              },
            )
          }
        >
          Save part
        </Button>
        <Button variant="ghost" className="h-9" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

type LowItem = { id: string; name: string; sku: string; suggested: number };

/** Raise one purchase order for every item at or below its reorder level. */
export function RestockForm({ shopId, items }: { shopId: string; items: LowItem[] }) {
  const { pending, exec } = useAction();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.suggested])),
  );
  const [supplier, setSupplier] = useState("");

  if (!items.length) return null;
  if (!open) {
    return (
      <Button className="h-9" onClick={() => setOpen(true)}>
        <ShoppingCart /> Restock {items.length} low item{items.length > 1 ? "s" : ""}
      </Button>
    );
  }
  return (
    <div className="panel w-full space-y-3 p-4">
      <p className="text-sm font-medium text-foreground">Restock order</p>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 text-sm">
            <span className="flex-1 text-steel">
              {i.name} <span className="font-mono text-xs text-muted-foreground">{i.sku}</span>
            </span>
            <Input
              type="number"
              min={0}
              className="h-8 w-20 text-right tabular"
              value={qty[i.id] ?? 0}
              onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Number(e.target.value)) })}
              aria-label={`Order quantity for ${i.name}`}
            />
          </li>
        ))}
      </ul>
      <Input placeholder="Supplier (optional)" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-9 max-w-sm" />
      <div className="flex gap-2">
        <Button
          className="h-9"
          disabled={pending}
          onClick={() =>
            exec(
              () =>
                createRestockOrderAction(shopId, {
                  supplier: supplier || undefined,
                  lines: Object.entries(qty)
                    .filter(([, q]) => q > 0)
                    .map(([inventoryItemId, q]) => ({ inventoryItemId, qty: q })),
                }),
              () => setOpen(false),
            )
          }
        >
          Raise purchase order
        </Button>
        <Button variant="ghost" className="h-9" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
