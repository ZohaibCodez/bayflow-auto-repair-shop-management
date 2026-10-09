import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { IMAGES, photoBackground } from "@/lib/images";

/**
 * Shown for unknown URLs — and on purpose for pages the signed-in user may not see
 * (another shop, another role), so a guessed URL reveals nothing.
 */
export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0" style={photoBackground(IMAGES.notFound, "none")} aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/50" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bay-grid" aria-hidden />
      <div className="relative max-w-md text-center">
        <Link href="/" className="inline-flex" aria-label="BayFlow home">
          <Logo />
        </Link>
        <p className="eyebrow mt-10">Error 404</p>
        <h1 className="mt-3 font-display text-4xl text-foreground">Empty bay.</h1>
        <p className="mt-4 text-muted-foreground">
          This page could not be found — or it belongs to a shop or role your account can&rsquo;t open.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button render={<Link href="/" />} variant="outline" className="h-10 px-5">
            Home
          </Button>
          <Button render={<Link href="/dashboard" />} className="h-10 px-5">
            My dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
