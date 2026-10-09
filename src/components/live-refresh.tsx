"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a screen in sync with what other people are doing: polls a tiny version endpoint
 * and calls router.refresh() (server components re-render, client state is kept) when it
 * changes. Pauses while the tab is hidden.
 */
export function LiveRefresh({ query, intervalMs = 4000 }: { query: string; intervalMs?: number }) {
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/live?${query}`, { cache: "no-store" });
          if (res.ok) {
            const { v } = (await res.json()) as { v: string };
            if (last.current !== null && v !== last.current) router.refresh();
            last.current = v;
          }
        } catch {
          /* offline for a moment — try again next tick */
        }
      }
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [query, intervalMs, router]);

  return null;
}
