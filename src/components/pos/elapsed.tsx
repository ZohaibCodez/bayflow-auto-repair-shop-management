"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/time";

/**
 * How long a job has sat where it is, kept honest without a hydration mismatch:
 * the server's value renders first, then the client takes over and re-counts
 * every half minute. The page itself only re-renders when something actually
 * changes in the shop, so without this the clocks would quietly go stale.
 */
export function Elapsed({ since, initial }: { since: string; initial: string }) {
  const [label, setLabel] = useState(initial);

  useEffect(() => {
    const from = new Date(since);
    const tick = () => setLabel(formatElapsed(from));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <time dateTime={since} title={new Date(since).toLocaleString()}>
      {label}
    </time>
  );
}
