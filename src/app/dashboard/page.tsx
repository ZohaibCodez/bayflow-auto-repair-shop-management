import { redirect } from "next/navigation";
import { guard } from "@/lib/page-guard";
import { getStaffShops, requireUser } from "@/lib/rbac";

/** Post-login router: owners and staff go to the POS, customers to their bookings. */
export default async function DashboardRouter() {
  const user = await guard(requireUser(), "/dashboard");
  const shops = await getStaffShops(user.id);
  redirect(shops.length ? `/pos/${shops[0].id}` : "/account");
}
