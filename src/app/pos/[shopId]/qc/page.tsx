import Link from "next/link";
import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { hasShopRole, requireShopAccess } from "@/lib/rbac";
import { formatRelative } from "@/lib/time";
import { listShopBookings } from "@/server/queries/bookings";
import { ClaimButton } from "@/components/booking/claim-button";
import { StatusBadge } from "@/components/booking/status-badge";
import { EmptyState, PageHeader } from "@/components/pos/page-header";
import { IMAGES } from "@/lib/images";

export default async function QcQueuePage({ params }: PageProps<"/pos/[shopId]/qc">) {
  const { shopId } = await params;
  const { access, actor, user } = await guard(requireShopAccess(shopId, ["OWNER", "QC"]), `/pos/${shopId}/qc`);
  const rows = await listShopBookings(shopId, actor, { statuses: ["QC_PENDING", "QC_IN_PROGRESS"] });
  const queue = rows.filter((b) => b.status === "QC_PENDING").sort((a, b) => +a.updatedAt - +b.updatedAt);
  const testing = rows.filter((b) => b.status === "QC_IN_PROGRESS");
  const canPick = hasShopRole(access, ["QC"]);
  const href = (id: string) => `/pos/${shopId}/bookings/${id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Quality control"
        title="QC queue"
        description="Any inspector can pick a job. The first to pick locks it, so two people never test the same car."
      />

      <section className="space-y-3">
        <h2 className="eyebrow">Waiting · oldest first</h2>
        {queue.length ? (
          <ul className="panel divide-y divide-line/70 overflow-hidden">
            {queue.map((b) => (
              <li key={b.id} className="flex items-center gap-4 px-4 py-3.5">
                <Link href={href(b.id)} className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                    {b.issues.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-signal-red">
                        <ShieldAlert className="size-3.5" /> re-test
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{b.code}</span> · {b.vehicle.plate} · tech {b.assignedTech?.name ?? "—"} · queued{" "}
                    {formatRelative(b.updatedAt)}
                  </p>
                </Link>
                {canPick ? <ClaimButton bookingId={b.id} href={href(b.id)} /> : <StatusBadge status={b.status} />}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<ClipboardCheck className="size-6" />} image={IMAGES.empty.queueClear} title="Queue is clear">
            Jobs appear here when a technician sends them to QC.
          </EmptyState>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Being tested</h2>
        {testing.length ? (
          <ul className="panel divide-y divide-line/70 overflow-hidden">
            {testing.map((b) => (
              <li key={b.id}>
                <Link href={href(b.id)} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {b.vehicle.make} {b.vehicle.model} <span className="font-mono text-xs text-muted-foreground">{b.vehicle.plate}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Locked by {b.qcInspectorId === user.id ? "you" : b.qcInspector?.name}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nobody is testing right now.</p>
        )}
      </section>
    </div>
  );
}
