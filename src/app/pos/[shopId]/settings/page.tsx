import { notFound } from "next/navigation";
import { guard } from "@/lib/page-guard";
import { requireShopAccess } from "@/lib/rbac";
import { DEFAULT_WORKING_HOURS } from "@/lib/slots";
import { getShopSettings } from "@/server/queries/shop";
import { PageHeader } from "@/components/pos/page-header";
import { ShopForm, type ShopFormValues } from "@/components/pos/owner-forms";

export default async function SettingsPage({ params }: PageProps<"/pos/[shopId]/settings">) {
  const { shopId } = await params;
  await guard(requireShopAccess(shopId, ["OWNER"]), `/pos/${shopId}/settings`);
  const shop = await getShopSettings(shopId);
  if (!shop) notFound();

  const hours = { ...DEFAULT_WORKING_HOURS, ...(shop.workingHours as object) } as ShopFormValues["workingHours"];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Owner" title="Shop settings" description="Details customers see, and the hours and bays that drive slot availability." />
      <ShopForm
        shopId={shopId}
        initial={{
          name: shop.name,
          address: shop.address,
          city: shop.city,
          phone: shop.phone,
          description: shop.description ?? "",
          slotDurationMin: shop.slotDurationMin,
          slotCapacity: shop.slotCapacity,
          workingHours: hours,
        }}
      />
    </div>
  );
}
