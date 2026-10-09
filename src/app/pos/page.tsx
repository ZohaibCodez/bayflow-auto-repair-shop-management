import { redirect } from "next/navigation";
import { guard } from "@/lib/page-guard";
import { getStaffShops, requireUser } from "@/lib/rbac";

/** /pos → the user's first shop, or the create-shop screen if they have none. */
export default async function PosIndex() {
  const user = await guard(requireUser(), "/pos");
  const shops = await getStaffShops(user.id);
  redirect(shops.length ? `/pos/${shops[0].id}` : "/pos/new");
}
