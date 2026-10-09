import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BookPage(props: PageProps<"/book/[shopId]">) {
  const { shopId } = await props.params;
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, city: true },
  });
  if (!shop) notFound();

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bay-grid" aria-hidden />
      <div className="relative w-full max-w-md text-center">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-10 font-display text-3xl text-foreground">
          Booking {shop.name}
        </h1>
        <p className="mt-3 text-muted-foreground">
          The booking wizard — services, time slot and vehicle details — is the next
          build step. For now, the shop is live in {shop.city}.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button render={<Link href="/#shops" />} variant="outline" className="h-10 px-5">
            Browse shops
          </Button>
          <Button render={<Link href="/login" />} className="h-10 px-5">
            Sign in
          </Button>
        </div>
      </div>
    </main>
  );
}
