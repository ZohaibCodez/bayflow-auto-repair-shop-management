"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export type SwitcherShop = { id: string; name: string; city: string; roles: string[] };

const ROLE_SHORT: Record<string, string> = {
  OWNER: "Owner",
  SERVICE_ADVISOR: "Advisor",
  TECHNICIAN: "Tech",
  QC: "QC",
  PARTS: "Parts",
};

/** The owner's shop switcher (and every staff member's "where am I"). */
export function ShopSwitcher({ shops, currentId }: { shops: SwitcherShop[]; currentId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = shops.find((s) => s.id === currentId);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-amber/30"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-amber/15 text-amber">
          <Store className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{current?.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {current?.city} · {current?.roles.map((r) => ROLE_SHORT[r] ?? r).join(", ")}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-line bg-surface-2 p-1 shadow-2xl shadow-black/40">
          <p className="eyebrow px-2.5 pt-2 pb-1.5">Your shops</p>
          {shops.map((s) => (
            <Link
              key={s.id}
              href={`/pos/${s.id}`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface",
                s.id === currentId && "bg-surface",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {s.city} · {s.roles.map((r) => ROLE_SHORT[r] ?? r).join(", ")}
                </span>
              </span>
              {s.id === currentId && <Check className="size-4 text-amber" />}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <Link
            href="/pos/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <Plus className="size-4" /> Create a new shop
          </Link>
        </div>
      )}
    </div>
  );
}
