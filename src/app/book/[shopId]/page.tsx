import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/rbac";
import { bookableDays, type WorkingHours } from "@/lib/slots";
import { Logo } from "@/components/brand/logo";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/book/[shopId]">) {
  const { shopId } = await params;
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } });
  return { title: shop ? `Book ${shop.name} — BayFlow` : "Book a service — BayFlow" };
}

export default async function BookPage({ params }: PageProps<"/book/[shopId]">) {
  const { shopId } = await params;
  const [shop, user] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        rating: true,
        workingHours: true,
        slotDurationMin: true,
        services: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, description: true, durationMin: true, basePrice: true },
        },
      },
    }),
    getCurrentUser(),
  ]);
  if (!shop) notFound();

  const vehicles = user
    ? await prisma.vehicle.findMany({
        where: { customerId: user.id },
        select: { id: true, plate: true, make: true, model: true, year: true },
        orderBy: { year: "desc" },
      })
    : [];

  const days = bookableDays(shop.workingHours as WorkingHours, shop.slotDurationMin);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bay-grid opacity-60" aria-hidden />
      <header className="relative border-b border-line/70 bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="BayFlow home">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/#shops" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" /> All shops
            </Link>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <BookingWizard
          shop={{ id: shop.id, name: shop.name, city: shop.city, address: shop.address, rating: shop.rating }}
          services={shop.services}
          days={days}
          user={user ? { name: user.name, email: user.email } : null}
          vehicles={vehicles}
        />
      </main>
    </div>
  );
}
