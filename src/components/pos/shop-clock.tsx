"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/lib/time";

/**
 * The time at the shop, not on your laptop. Every shop is in Asia/Karachi, so
 * staff abroad (and the server, which runs in UTC) still read the floor's clock.
 * Starts from the server's value so the first paint matches.
 */
export function ShopClock({ initial }: { initial: string }) {
  const [now, setNow] = useState(initial);

  useEffect(() => {
    const tick = () => setNow(formatTime(new Date()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="readout inline-flex items-center gap-1.5 text-foreground">
      <span className="pulse-dot size-1.5 rounded-full bg-teal text-teal" aria-hidden />
      {now}
      <span className="sr-only">shop time</span>
    </span>
  );
}
