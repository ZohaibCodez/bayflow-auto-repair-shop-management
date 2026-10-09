import type { BookingStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STATUS_META, TONE_CLASS, statusLabel } from "@/lib/booking/status-meta";

export function StatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: BookingStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const tone = TONE_CLASS[STATUS_META[status].tone];
  const live = status !== "COMPLETED" && status !== "CANCELLED";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2.5 text-xs" : "h-7 px-3 text-sm",
        tone.text,
        tone.soft,
        tone.border,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot, live && "pulse-dot")} />
      {statusLabel(status)}
    </span>
  );
}
