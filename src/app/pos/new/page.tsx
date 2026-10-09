import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { getStaffShops, requireUser } from "@/lib/rbac";
import { Logo } from "@/components/brand/logo";
import { ShopForm } from "@/components/pos/owner-forms";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const metadata = { title: "Create a shop — BayFlow" };

export default async function NewShopPage() {
  const user = await guard(requireUser(), "/pos/new");
  const shops = await getStaffShops(user.id);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bay-grid opacity-60" aria-hidden />
      <header className="relative border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="BayFlow home">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {shops.length > 0 && (
              <Link href="/pos" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="size-4" /> Back to POS
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <p className="eyebrow mb-2">{shops.length ? "Another location" : "Welcome"}, {user.name.split(" ")[0]}</p>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">Create a shop</h1>
          <p className="mt-2 text-muted-foreground">
            Each shop gets its own team, services, slots and inventory. You can run as many as you like and switch between
            them from the POS.
          </p>
        </div>
        <ShopForm />
      </main>
    </div>
  );
}
