import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { requireBookingAccess } from "@/lib/rbac";
import { formatDateTime, formatLongDay } from "@/lib/time";
import { formatPKR } from "@/lib/money";
import { statusLabel } from "@/lib/booking/status-meta";
import { getBookingDetail } from "@/server/queries/bookings";
import { Logo } from "@/components/brand/logo";
import { PrintButton } from "@/components/booking/print-button";

export const metadata = { title: "Invoice — BayFlow" };

/**
 * Printable invoice / job sheet. Visible to the booking's customer and to staff who can see
 * the booking (same rules as everywhere else). Lines come from the approved estimate.
 */
export default async function InvoicePage({ params }: PageProps<"/invoice/[bookingId]">) {
  const { bookingId } = await params;
  const { actor, booking: ref } = await guard(requireBookingAccess(bookingId), `/invoice/${bookingId}`);
  const b = await getBookingDetail(bookingId);
  if (!b) notFound();

  const estimate = b.estimates.find((e) => e.status === "APPROVED");
  const items = estimate?.items ?? [];
  const parts = items.filter((i) => i.kind === "PART");
  const labour = items.filter((i) => i.kind === "LABOR");
  const sum = (rows: typeof items) => rows.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const total = sum(items);
  const completedAt = b.timeline.find((e) => e.toStatus === "COMPLETED")?.createdAt;
  const isCustomer = ref.customerId === actor.userId;
  const back = isCustomer ? `/account/bookings/${b.id}` : `/pos/${b.shopId}/bookings/${b.id}`;

  return (
    <div className="min-h-screen bg-ink py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Link href={back} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Back to booking
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl rounded-xl border border-line bg-surface p-8 shadow-[var(--shadow-panel)] sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:text-black print:shadow-none">
        <header className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-4 text-sm font-medium text-foreground">{b.shop.name}</p>
            <p className="text-sm text-muted-foreground">
              {b.shop.address}, {b.shop.city}
            </p>
            <p className="text-sm text-muted-foreground">{b.shop.phone}</p>
          </div>
          <div className="sm:text-right">
            <p className="eyebrow">{b.status === "COMPLETED" ? "Invoice" : "Job sheet"}</p>
            <p className="mt-1 font-mono text-xl text-foreground">{b.code}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {completedAt ? `Completed ${formatDateTime(completedAt)}` : `Status: ${statusLabel(b.status)}`}
            </p>
            {estimate?.respondedAt && (
              <p className="text-sm text-muted-foreground">
                Estimate v{estimate.revision} approved {formatDateTime(estimate.respondedAt)}
              </p>
            )}
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-3">
          <div>
            <p className="eyebrow mb-1.5">Billed to</p>
            <p className="text-sm text-foreground">{b.customer.name}</p>
            <p className="text-sm text-muted-foreground">{b.customer.email}</p>
            {b.customer.phone && <p className="text-sm text-muted-foreground">{b.customer.phone}</p>}
          </div>
          <div>
            <p className="eyebrow mb-1.5">Vehicle</p>
            <p className="text-sm text-foreground">
              {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
            </p>
            <p className="font-mono text-sm text-muted-foreground">{b.vehicle.plate}</p>
            {b.vehicle.mileage != null && (
              <p className="text-sm text-muted-foreground">{b.vehicle.mileage.toLocaleString()} km</p>
            )}
          </div>
          <div>
            <p className="eyebrow mb-1.5">Appointment</p>
            <p className="text-sm text-foreground">{b.slot ? formatLongDay(b.slot.startsAt) : "—"}</p>
            <p className="text-sm text-muted-foreground">Technician: {b.assignedTech?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">QC: {b.qcInspector?.name ?? "—"}</p>
          </div>
        </section>

        {items.length ? (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left [&>th]:pb-2 [&>th]:font-normal [&>th]:text-muted-foreground">
                <th>Description</th>
                <th className="w-16 text-right">Qty</th>
                <th className="w-32 text-right">Unit</th>
                <th className="w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Parts", parts],
                ["Labour", labour],
              ].map(([title, rows]) =>
                (rows as typeof items).length ? (
                  <FragmentRows key={title as string} title={title as string} rows={rows as typeof items} />
                ) : null,
              )}
            </tbody>
            <tfoot>
              <tr className="[&>td]:pt-4">
                <td colSpan={3} className="text-right text-muted-foreground">
                  Parts {formatPKR(sum(parts))} · Labour {formatPKR(sum(labour))}
                </td>
                <td />
              </tr>
              <tr className="[&>td]:pt-2">
                <td colSpan={3} className="pr-4 text-right font-medium text-foreground">
                  Total
                </td>
                <td className="text-right font-display-md text-xl text-foreground tabular">{formatPKR(total)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">No approved estimate yet — the invoice fills in once the customer approves.</p>
        )}

        <footer className="mt-10 border-t border-line pt-4 text-xs text-muted-foreground">
          Work carried out as per the estimate approved in-app by the customer. Quality-checked before hand-over.
          Thank you for choosing {b.shop.name}.
        </footer>
      </article>
    </div>
  );
}

function FragmentRows({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; name: string; qty: number; unitCost: number }[];
}) {
  return (
    <>
      <tr>
        <td colSpan={4} className="pt-4 pb-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          {title}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.id} className="border-b border-line/60 [&>td]:py-2">
          <td className="text-foreground">{r.name}</td>
          <td className="text-right tabular">{r.qty}</td>
          <td className="text-right text-steel tabular">{formatPKR(r.unitCost)}</td>
          <td className="text-right text-foreground tabular">{formatPKR(r.qty * r.unitCost)}</td>
        </tr>
      ))}
    </>
  );
}
