import { Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/money";

export type EstimateLine = {
  id: string;
  kind: "PART" | "LABOR";
  name: string;
  qty: number;
  unitCost: number;
};

export const estimateTotal = (items: { qty: number; unitCost: number }[]) =>
  items.reduce((s, i) => s + i.qty * i.unitCost, 0);

function LineGroup({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof Package;
  rows: EstimateLine[];
}) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="eyebrow mb-2 flex items-center gap-1.5">
        <Icon className="size-3" /> {title}
      </p>
      <ul className="divide-y divide-line/70">
        {rows.map((r) => (
          <li key={r.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
            <span className="min-w-0 text-foreground">
              {r.name}
              {r.qty > 1 && (
                <span className="ml-2 text-xs text-muted-foreground tabular">
                  {r.qty} × {formatPKR(r.unitCost)}
                </span>
              )}
            </span>
            <span className="shrink-0 text-steel tabular">{formatPKR(r.qty * r.unitCost)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Read-only itemised estimate: parts, then labour, then the total. */
export function EstimateView({ items, className }: { items: EstimateLine[]; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <LineGroup title="Parts" icon={Package} rows={items.filter((i) => i.kind === "PART")} />
      <LineGroup title="Labour" icon={Wrench} rows={items.filter((i) => i.kind === "LABOR")} />
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="font-display-md text-2xl text-foreground tabular">
          {formatPKR(estimateTotal(items))}
        </span>
      </div>
    </div>
  );
}
