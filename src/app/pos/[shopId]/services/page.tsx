import { Clock } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { requireShopAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/money";
import { getServices } from "@/server/queries/shop";
import { PageHeader } from "@/components/pos/page-header";
import { ServiceEditor, ServiceRowControls } from "@/components/pos/owner-forms";

export default async function ServicesPage({ params }: PageProps<"/pos/[shopId]/services">) {
  const { shopId } = await params;
  await guard(requireShopAccess(shopId, ["OWNER"]), `/pos/${shopId}/services`);
  const services = await getServices(shopId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Owner"
        title="Service catalogue"
        description="What customers can pick in the booking wizard. Hidden services stay on past bookings but can't be booked."
      />

      <section className="panel p-5">
        <p className="eyebrow mb-4">Add a service</p>
        <ServiceEditor shopId={shopId} />
      </section>

      <ul className="panel divide-y divide-line/70">
        {services.map((s) => (
          <li key={s.id} className={cn("flex flex-wrap items-center gap-4 px-4 py-3", !s.active && "opacity-55")}>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {s.name}
                {!s.active && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                {s.description && <span>{s.description}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="size-3" /> {s.durationMin} min
                </span>
                {s.basePrice != null && <span>from {formatPKR(s.basePrice)}</span>}
              </p>
            </div>
            <ServiceRowControls shopId={shopId} service={s} active={s.active} />
          </li>
        ))}
      </ul>
    </div>
  );
}
