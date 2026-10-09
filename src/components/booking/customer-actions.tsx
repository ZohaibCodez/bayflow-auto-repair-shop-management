"use client";

import { useState } from "react";
import { Check, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/use-action";
import {
  cancelBookingAction,
  completeBookingAction,
  respondToEstimateAction,
} from "@/server/actions/booking";

/** Customer: approve or decline the pending estimate (stamped with the time in the audit log). */
export function EstimateDecision({ bookingId, total }: { bookingId: string; total: string }) {
  const { pending, exec } = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  if (rejecting) {
    return (
      <div className="space-y-3">
        <Textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell the shop why (optional) — e.g. too expensive, I only want the oil change"
          className="min-h-20"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            className="h-11 px-5"
            disabled={pending}
            onClick={() => exec(() => respondToEstimateAction(bookingId, "reject", reason))}
          >
            <X /> Decline estimate
          </Button>
          <Button variant="ghost" className="h-11" onClick={() => setRejecting(false)} disabled={pending}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        className="h-11 flex-1 px-5 text-base sm:flex-none"
        disabled={pending}
        onClick={() => exec(() => respondToEstimateAction(bookingId, "approve"))}
      >
        <Check /> Approve {total}
      </Button>
      <Button variant="outline" className="h-11 px-5" disabled={pending} onClick={() => setRejecting(true)}>
        Decline
      </Button>
    </div>
  );
}

export function PickupButton({ bookingId }: { bookingId: string }) {
  const { pending, exec } = useAction();
  return (
    <Button
      className="h-11 bg-teal px-5 text-[#04140f] hover:bg-teal/85"
      disabled={pending}
      onClick={() => exec(() => completeBookingAction(bookingId))}
    >
      <CheckCircle2 /> I&rsquo;ve collected my car
    </Button>
  );
}

export function CancelBooking({ bookingId }: { bookingId: string }) {
  const { pending, exec } = useAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground transition-colors hover:text-signal-red"
      >
        Cancel this booking
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="min-h-16"
      />
      <div className="flex gap-2">
        <Button
          variant="destructive"
          className="h-9"
          disabled={pending}
          onClick={() => exec(() => cancelBookingAction(bookingId, reason))}
        >
          Yes, cancel booking
        </Button>
        <Button variant="ghost" className="h-9" onClick={() => setOpen(false)}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
