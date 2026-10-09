import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";
import type { BookingRow } from "@/server/queries/bookings";
import { StatusBadge } from "./status-badge";

/** A "lane" of jobs waiting on a specific action — the building block of every role's home. */
export function JobLane({
  title,
  hint,
  rows,
  hrefFor,
  accent = false,
  empty = "Nothing waiting.",
}: {
  title: string;
  hint?: string;
  rows: BookingRow[];
  hrefFor: (id: string) => string;
  accent?: boolean;
  empty?: string;
}) {
  return (
    <section className={cn("panel flex min-h-40 flex-col", accent && rows.length > 0 && "border-amber/30")}>
      <header className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={cn(
            "grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs tabular",
            rows.length ? (accent ? "bg-amber text-[#1a1205]" : "bg-surface-2 text-foreground") : "bg-surface-2 text-muted-foreground",
          )}
        >
          {rows.length}
        </span>
      </header>
      {rows.length ? (
        <ul className="flex-1 divide-y divide-line/60">
          {rows.map((b) => (
            <li key={b.id}>
              <Link href={hrefFor(b.id)} className="block px-4 py-3 transition-colors hover:bg-surface-2/60">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm text-foreground">
                    {b.vehicle.make} {b.vehicle.model}
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">{b.vehicle.plate}</span>
                  </p>
                  {b.issues.length > 0 && <ShieldAlert className="size-3.5 shrink-0 text-signal-red" />}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {b.customer.name}
                  {b.slot && ` · ${formatDateTime(b.slot.startsAt)}`}
                </p>
                <StatusBadge status={b.status} className="mt-2" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="grid flex-1 place-items-center px-4 py-8 text-center text-sm text-muted-foreground/70">{empty}</p>
      )}
    </section>
  );
}
