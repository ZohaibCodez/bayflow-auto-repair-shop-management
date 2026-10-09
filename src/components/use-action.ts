"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/actions/result";

/**
 * Call a server action from a client component with a pending state and a toast for the
 * outcome. Returns `true` when the action succeeded (so callers can reset local state).
 */
export function useAction() {
  const [pending, startTransition] = useTransition();

  function exec(fn: () => Promise<ActionResult<unknown>>, onSuccess?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.message) toast.success(res.message);
        onSuccess?.();
      } else {
        toast.error(res.error);
      }
    });
  }

  return { pending, exec };
}
