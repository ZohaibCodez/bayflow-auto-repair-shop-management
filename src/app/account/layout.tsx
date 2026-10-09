import Link from "next/link";
import { LogOut } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { getStaffShops, requireUser } from "@/lib/rbac";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOutAction } from "@/server/actions/auth";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await guard(requireUser(), "/account");
  const staffShops = await getStaffShops(user.id);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bay-grid opacity-50" aria-hidden />
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="BayFlow home">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
              <Link href="/account" className="hover:text-foreground">
                My bookings
              </Link>
              <Link href="/#shops" className="hover:text-foreground">
                Book a service
              </Link>
              {staffShops.length > 0 && (
                <Link href="/pos" className="hover:text-foreground">
                  Shop POS
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <NotificationBell />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="icon-lg" title="Sign out" aria-label="Sign out">
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      <footer className="border-t border-line/60 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground sm:px-6">
          <span>Signed in as {user.email}</span>
          <ThemeToggle className="sm:hidden" />
        </div>
      </footer>
    </div>
  );
}
