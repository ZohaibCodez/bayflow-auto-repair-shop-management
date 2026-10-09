import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCurrentUser } from "@/lib/rbac";

export async function SiteNav() {
  const user = await getCurrentUser();
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="border-b border-line/70 bg-ink/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="BayFlow home">
            <Logo />
          </Link>

          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link href="/#shops" className="transition-colors hover:text-foreground">
              Find a shop
            </Link>
            <Link href="/#how" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              For shop owners
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            {user ? (
              <Button render={<Link href="/dashboard" />} variant="ghost" size="sm">
                Dashboard
              </Button>
            ) : (
              <Button render={<Link href="/login" />} variant="ghost" size="sm">
                Sign in
              </Button>
            )}
            <Button render={<Link href="/#shops" />} size="sm">
              Book a service
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
