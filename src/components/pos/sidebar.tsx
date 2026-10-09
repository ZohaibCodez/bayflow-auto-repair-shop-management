"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  PhoneCall,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/server/actions/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ShopSwitcher, type SwitcherShop } from "./shop-switcher";

const ICONS: Record<string, LucideIcon> = {
  overview: Gauge,
  bookings: ClipboardList,
  jobs: Wrench,
  qc: ClipboardCheck,
  calls: PhoneCall,
  inventory: Boxes,
  orders: ShoppingCart,
  team: Users,
  services: Wrench,
  settings: Settings,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; exact?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="eyebrow mb-2 px-3">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-surface-2 text-foreground"
                        : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
                    )}
                  >
                    {active && <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-amber" />}
                    <Icon className={cn("size-4", active ? "text-amber" : "text-steel/70")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-amber/15 px-1.5 py-px text-[11px] font-medium text-amber tabular">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ name, email }: { name: string; email: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/50 p-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-steel/15 text-xs font-semibold text-steel">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          title="Sign out"
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Sign out</span>
        </button>
      </form>
    </div>
  );
}

type Props = {
  groups: NavGroup[];
  shops: SwitcherShop[];
  currentShopId: string;
  user: { name: string; email: string };
};

export function Sidebar({ groups, shops, currentShopId, user }: Props) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-ink lg:flex">
      <div className="px-5 pt-5 pb-4">
        <Link href="/" aria-label="BayFlow home">
          <Logo />
        </Link>
      </div>
      <div className="px-3">
        <ShopSwitcher shops={shops} currentId={currentShopId} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6">
        <NavLinks groups={groups} />
      </div>
      <div className="p-3">
        <UserCard {...user} />
      </div>
    </aside>
  );
}

/** Mobile: a top bar with a slide-in drawer holding the same navigation. */
export function MobileNav({ groups, shops, currentShopId, user, bell }: Props & { bell: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ink/85 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 text-steel"
        >
          <Menu className="size-4" />
        </button>
        <Logo />
        {bell}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(85vw,300px)] flex-col border-r border-line bg-ink animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-md text-muted-foreground"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-3">
              <ShopSwitcher shops={shops} currentId={currentShopId} />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-6">
              <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
            </div>
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <UserCard {...user} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
