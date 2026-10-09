import Link from "next/link";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { formatDateTime } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import type { BookingRow as Row } from "@/server/queries/bookings";
import { StatusBadge } from "./status-badge";
import { ProgressRail } from "./progress-rail";
import { estimateTotal } from "./estimate-view";

/** One booking in a POS list: vehicle, customer, slot, status, pipeline, crew, value. */
export function BookingRow({ b, href }: { b: Row; href: string }) {
  const total = b.estimates[0] ? estimateTotal(b.estimates[0].items) : null;
  return (
    <Link
      href={href}
      className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_170px_120px_20px]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
          </span>
          {b.issues.length > 0 && (
            <ShieldAlert className="size-3.5 shrink-0 text-signal-red" aria-label="Open QC issue" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="font-mono">{b.code}</span> · <span className="font-mono">{b.vehicle.plate}</span> ·{" "}
          {b.customer.name}
        </p>
      </div>
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm text-steel">{b.slot ? formatDateTime(b.slot.startsAt) : "—"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {b.assignedTech ? `Tech: ${b.assignedTech.name}` : "No technician yet"}
        </p>
      </div>
      <div className="justify-self-end md:justify-self-start">
        <StatusBadge status={b.status} />
        <ProgressRail status={b.status} compact className="mt-2 hidden w-36 md:flex" />
      </div>
      <p className="hidden text-right text-sm text-steel tabular md:block">{total != null ? formatPKR(total) : "—"}</p>
      <ChevronRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block" />
    </Link>
  );
}
