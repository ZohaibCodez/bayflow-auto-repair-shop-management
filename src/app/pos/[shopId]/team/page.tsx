import { guard } from "@/lib/page-guard";
import { requireShopAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getTeam } from "@/server/queries/shop";
import { PageHeader } from "@/components/pos/page-header";
import { AddMemberForm, MemberControls, ROLE_LABEL } from "@/components/pos/owner-forms";

export default async function TeamPage({ params }: PageProps<"/pos/[shopId]/team">) {
  const { shopId } = await params;
  const { access } = await guard(requireShopAccess(shopId, ["OWNER"]), `/pos/${shopId}/team`);
  const team = await getTeam(shopId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Owner"
        title="Team"
        description={`Who works at ${access.shop.name}. Roles are per shop — someone can be a technician here and an advisor elsewhere.`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ul className="panel divide-y divide-line/70 self-start">
          {team.map((m) => (
            <li key={m.id} className={cn("flex flex-wrap items-center gap-4 px-4 py-3", !m.active && "opacity-60")}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-steel/15 text-xs font-semibold text-steel">
                {m.user.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {m.user.name}
                  {!m.active && <span className="ml-2 text-xs text-muted-foreground">(deactivated)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.user.email} · {ROLE_LABEL[m.role]}
                </p>
              </div>
              <MemberControls shopId={shopId} membershipId={m.id} role={m.role} active={m.active} />
            </li>
          ))}
          {!team.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">No team members yet.</li>}
        </ul>
        <AddMemberForm shopId={shopId} />
      </div>
    </div>
  );
}
