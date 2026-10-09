"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatElapsed } from "@/lib/time";

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
    // Fixed locale + shop time zone: `toLocaleString()` differed between the server and
    // the visitor's browser, which broke hydration on every POS overview.
    <time dateTime={since} title={formatDateTime(new Date(since))}>
      {label}
    </time>
  );
}
