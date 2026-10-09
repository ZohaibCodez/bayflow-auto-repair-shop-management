import Link from "next/link";
import { ArrowRight, Boxes, ShieldAlert, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  id: string;
  kind: "qc" | "declined" | "stock";
  title: string;
  detail: string;
  href: string;
};

const KIND = {
  qc: { icon: ShieldAlert, class: "bg-signal-red/12 text-signal-red" },
  declined: { icon: ThumbsDown, class: "bg-signal-red/12 text-signal-red" },
  stock: { icon: Boxes, class: "bg-amber/15 text-amber-ink" },
} as const;

/**
 * The things that went wrong, in one list instead of three mostly-empty panels.
 *
 * Renders nothing at all when the shop is clean — an empty "no problems" card is
 * just furniture, and its absence is already the good news.
 */
export function Attention({ items }: { items: AttentionItem[] }) {
  if (!items.length) return null;

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 border-b border-line/70 px-5 py-3.5">
        <h2 className="font-display-md text-base text-foreground">Needs attention</h2>
        <span className="readout text-xs text-muted-foreground">{items.length}</span>
      </header>
      <ul className="divide-y divide-line/60">
        {items.map((item) => {
          const kind = KIND[item.kind];
          const Icon = kind.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-2/50"
              >
                <span
                  className={cn("grid size-8 shrink-0 place-items-center rounded-lg", kind.class)}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
