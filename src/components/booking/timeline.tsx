import type { BookingStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STATUS_META, TONE_CLASS, statusLabel } from "@/lib/booking/status-meta";
import { formatDateTime, formatRelative } from "@/lib/time";

export type TimelineEvent = {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorName: string | null;
  actorRole: string | null;
  note: string | null;
  createdAt: Date;
};

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "Customer",
  OWNER: "Owner",
  SERVICE_ADVISOR: "Advisor",
  TECHNICIAN: "Technician",
  PARTS: "Parts",
  QC: "QC",
};

/** The audit trail — every accepted transition: who, when, from → to, note. Newest first. */
export function Timeline({ events, showActors = true }: { events: TimelineEvent[]; showActors?: boolean }) {
  return (
    <ol className="relative space-y-5">
      <span className="absolute top-2 bottom-2 left-[5px] w-px bg-line" aria-hidden />
      {events.map((e, i) => {
        const tone = TONE_CLASS[STATUS_META[e.toStatus].tone];
        const same = e.fromStatus === e.toStatus;
        return (
          <li key={e.id} className="relative pl-6">
            <span
              className={cn(
                "absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-surface",
                i === 0 ? tone.dot : "bg-line",
              )}
            />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className={cn("text-sm font-medium", i === 0 ? tone.text : "text-foreground")}>
                {same ? e.note ?? statusLabel(e.toStatus) : statusLabel(e.toStatus)}
              </span>
              <time
                className="text-xs text-muted-foreground"
                dateTime={e.createdAt.toISOString()}
                title={formatDateTime(e.createdAt)}
              >
                {formatRelative(e.createdAt)}
              </time>
            </div>
            {showActors && e.actorName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {e.actorName}
                {e.actorRole && (
                  <span className="ml-1.5 rounded border border-line px-1 py-px font-mono text-[10px] tracking-wide text-steel uppercase">
                    {ROLE_LABEL[e.actorRole] ?? e.actorRole}
                  </span>
                )}
              </p>
            )}
            {e.note && !same && <p className="mt-1.5 text-sm text-steel">{e.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
