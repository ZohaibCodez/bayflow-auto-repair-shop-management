"use client";

import { useRouter } from "next/navigation";
import { Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import { claimQcAction } from "@/server/actions/booking";

/** Pick a job straight from the QC queue, then open it. */
export function ClaimButton({ bookingId, href }: { bookingId: string; href: string }) {
  const router = useRouter();
  const { pending, exec } = useAction();
  return (
    <Button
      size="sm"
      className="h-8 px-3"
      disabled={pending}
      onClick={() => exec(() => claimQcAction(bookingId), () => router.push(href))}
    >
      <Hand /> Pick
    </Button>
  );
}
