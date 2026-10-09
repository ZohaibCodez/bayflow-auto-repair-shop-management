"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/time";

type Item = { id: string; type: string; message: string; href: string | null; read: boolean; createdAt: string };
type Feed = { unread: number; items: Item[] };

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : { unread: 0, items: [] }));

/** In-app notifications: unread badge, dropdown feed, polls every 15s and refreshes the page on new items. */
export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const router = useRouter();
  const { data, mutate } = useSWR<Feed>("/api/notifications", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lastTop = useRef<string | null>(null);

  // A new notification usually means the board changed — refresh server data quietly.
  useEffect(() => {
    const top = data?.items[0]?.id ?? null;
    if (lastTop.current && top && top !== lastTop.current) router.refresh();
    lastTop.current = top;
  }, [data, router]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    mutate();
  }

  const unread = data?.unread ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className={cn(
          "relative grid size-9 place-items-center rounded-lg border border-line bg-surface-2 text-steel transition-colors hover:text-foreground",
          open && "border-amber/40 text-foreground",
        )}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber px-1 text-[10px] font-semibold text-[#1a1205] tabular">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-11 z-50 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-line bg-surface-2 shadow-2xl shadow-black/40",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {!data?.items.length && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">You&rsquo;re all caught up.</li>
            )}
            {data?.items.map((n) => {
              const body = (
                <div className="flex gap-3 px-4 py-3">
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-amber")}
                  />
                  <div className="min-w-0">
                    <p className={cn("text-sm", n.read ? "text-muted-foreground" : "text-foreground")}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {formatRelative(new Date(n.createdAt))}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} className="border-b border-line/50 last:border-0 hover:bg-surface">
                  {n.href ? (
                    <Link
                      href={n.href}
                      onClick={() => {
                        setOpen(false);
                        if (!n.read) markRead(n.id);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button type="button" className="w-full text-left" onClick={() => !n.read && markRead(n.id)}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
