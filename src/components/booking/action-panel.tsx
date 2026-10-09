"use client";

import { useState } from "react";
import {
  ArrowRight,
  Ban,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Hand,
  PackageCheck,
  PackageSearch,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import type { Action } from "@/lib/booking/state-machine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/use-action";
import {
  EstimateEditor,
  toItems,
  type DraftLine,
  type InventoryOption,
} from "@/components/booking/estimate-editor";
import * as act from "@/server/actions/booking";
import { receivePurchaseOrderAction } from "@/server/actions/shop";

type Person = { id: string; name: string };
type Requirement = {
  inventoryItemId: string;
  sku: string;
  name: string;
  required: number;
  reserved: number;
  onHand: number;
  onOrder: number;
  shortfall: number;
};
export type OpenPO = {
  id: string;
  status: string;
  supplier: string | null;
  items: { id: string; name: string; qtyOrdered: number; qtyReceived: number }[];
};

export type ActionPanelProps = {
  bookingId: string;
  shopId: string;
  status: BookingStatus;
  actions: Action[];
  waitingOn: string;
  technicians: Person[];
  partsPeople: Person[];
  inventory: InventoryOption[];
  draft: DraftLine[];
  requirement: Requirement[];
  openPOs: OpenPO[];
  canReceive: boolean;
  openIssues: { id: string; title: string; description: string | null }[];
};

/** A titled block inside the panel. */
function Step({
  icon: Icon,
  title,
  hint,
  children,
  tone = "amber",
}: {
  icon: typeof Play;
  title: string;
  hint?: string;
  children: React.ReactNode;
  tone?: "amber" | "red" | "teal";
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            tone === "amber" && "bg-amber/15 text-amber",
            tone === "red" && "bg-signal-red/10 text-signal-red",
            tone === "teal" && "bg-teal/10 text-teal",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="sm:pl-11">{children}</div>
    </div>
  );
}

function PersonPicker({
  people,
  value,
  onChange,
  placeholder,
}: {
  people: Person[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} className="min-w-52 flex-1">
      <option value="">{placeholder}</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </NativeSelect>
  );
}

function RequirementTable({ rows }: { rows: Requirement[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No parts on this estimate — labour only.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-2/70 text-left">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-normal [&>th]:text-muted-foreground">
            <th>Part</th>
            <th className="text-right">Need</th>
            <th className="text-right">Reserved</th>
            <th className="text-right">On shelf</th>
            <th className="text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((r) => {
            const done = r.reserved >= r.required;
            return (
              <tr key={r.inventoryItemId} className="[&>td]:px-3 [&>td]:py-2">
                <td>
                  <span className="text-foreground">{r.name}</span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">{r.sku}</span>
                </td>
                <td className="text-right tabular">{r.required}</td>
                <td className="text-right tabular">{r.reserved}</td>
                <td className="text-right tabular">{r.onHand}</td>
                <td className="text-right">
                  {done ? (
                    <span className="text-xs text-teal">Reserved</span>
                  ) : r.shortfall > 0 ? (
                    <span className="text-xs text-amber">
                      Short {r.shortfall}
                      {r.onOrder > 0 && ` · ${r.onOrder} on order`}
                    </span>
                  ) : (
                    <span className="text-xs text-signal-cyan">In stock</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ReceiveForm({ shopId, po }: { shopId: string; po: OpenPO }) {
  const { pending, exec } = useAction();
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(po.items.map((i) => [i.id, i.qtyOrdered - i.qtyReceived])),
  );
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-foreground">
          PO <span className="font-mono text-xs text-muted-foreground">{po.id.slice(-6).toUpperCase()}</span>
          {po.supplier && <span className="text-muted-foreground"> · {po.supplier}</span>}
        </p>
        <span className="text-xs text-muted-foreground">{po.status.replace("_", " ").toLowerCase()}</span>
      </div>
      <ul className="space-y-2">
        {po.items.map((i) => {
          const left = i.qtyOrdered - i.qtyReceived;
          return (
            <li key={i.id} className="flex items-center gap-3 text-sm">
              <span className="flex-1 text-steel">
                {i.name}{" "}
                <span className="text-xs text-muted-foreground tabular">
                  ({i.qtyReceived}/{i.qtyOrdered} received)
                </span>
              </span>
              {left > 0 ? (
                <Input
                  type="number"
                  min={0}
                  max={left}
                  value={qty[i.id] ?? 0}
                  onChange={(e) => setQty((q) => ({ ...q, [i.id]: Math.max(0, Math.min(left, Number(e.target.value))) }))}
                  className="h-8 w-20 text-right tabular"
                  aria-label={`Quantity of ${i.name} received`}
                />
              ) : (
                <span className="text-xs text-teal">done</span>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        className="mt-3 h-9"
        disabled={pending}
        onClick={() =>
          exec(() =>
            receivePurchaseOrderAction(
              shopId,
              po.id,
              Object.entries(qty).map(([poItemId, q]) => ({ poItemId, qty: q })),
            ),
          )
        }
      >
        <Truck /> Confirm delivery
      </Button>
    </div>
  );
}

/** The role-aware "your next step" panel: renders exactly the actions this user may take now. */
export function ActionPanel(p: ActionPanelProps) {
  const { pending, exec } = useAction();
  const has = (a: Action) => p.actions.includes(a);
  const [tech, setTech] = useState("");
  const [partsPerson, setPartsPerson] = useState("");
  const [note, setNote] = useState("");
  const [supplier, setSupplier] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [qcChecks, setQcChecks] = useState<Record<string, boolean>>({});
  const [showDanger, setShowDanger] = useState(false);
  const [reason, setReason] = useState("");

  const primary = p.actions.filter((a) => a !== "cancel" && a !== "decline");
  const id = p.bookingId;

  if (!p.actions.length) {
    return (
      <div className="panel flex items-center gap-3 p-4">
        <span className="grid size-8 place-items-center rounded-lg bg-steel/10 text-steel">
          <Hand className="size-4" />
        </span>
        <p className="text-sm text-muted-foreground">
          {p.status === "COMPLETED" || p.status === "CANCELLED" ? (
            "This booking is closed — no further actions."
          ) : (
            <>
              Nothing for you to do right now. Waiting on{" "}
              <span className="text-foreground">{p.waitingOn.toLowerCase()}</span>.
            </>
          )}
        </p>
      </div>
    );
  }

  const QC_CHECKS = ["Road test", "Fluid levels & leaks", "Warning lights clear", "Work matches estimate"];

  return (
    <div className={cn("panel relative overflow-hidden", primary.length > 0 && "border-amber/30")}>
      {primary.length > 0 && (
        <div className="pointer-events-none absolute inset-0 amber-glow opacity-60" aria-hidden />
      )}
      <div className="relative space-y-6 p-5">
        <p className="eyebrow text-amber">{primary.length ? "Your next step" : "Status"}</p>

        {has("confirm") && (
          <Step icon={UserCheck} title="Confirm this booking" hint="Optionally assign the technician in the same step.">
            <div className="flex flex-wrap gap-2">
              <PersonPicker people={p.technicians} value={tech} onChange={setTech} placeholder="Assign later" />
              <Button className="h-9" disabled={pending} onClick={() => exec(() => act.confirmBookingAction(id, tech))}>
                {tech ? "Confirm & assign" : "Confirm"} <ArrowRight />
              </Button>
            </div>
          </Step>
        )}

        {has("assignTechnician") && (
          <Step icon={UserCheck} title="Assign a technician" hint="They'll see the job on their dashboard.">
            <div className="flex flex-wrap gap-2">
              <PersonPicker people={p.technicians} value={tech} onChange={setTech} placeholder="Choose technician…" />
              <Button
                className="h-9"
                disabled={pending || !tech}
                onClick={() => exec(() => act.assignTechnicianAction(id, tech))}
              >
                Assign <ArrowRight />
              </Button>
            </div>
          </Step>
        )}

        {has("startInspection") && (
          <Step icon={Play} title="Start the inspection" hint="Check the car, then build the itemised estimate.">
            <Button className="h-9" disabled={pending} onClick={() => exec(() => act.startInspectionAction(id))}>
              <Play /> Start inspection
            </Button>
          </Step>
        )}

        {has("submitEstimate") && (
          <Step
            icon={PackageSearch}
            title="Build the estimate"
            hint="Add every part and labour line. Parts link to inventory so shortages show up automatically."
          >
            <EstimateEditor inventory={p.inventory} initial={p.draft}>
              {(lines, valid) => (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Findings for the advisor (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-16"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-9"
                      disabled={pending || !valid}
                      onClick={() => exec(() => act.submitEstimateAction(id, toItems(lines), note))}
                    >
                      <Send /> Submit to advisor
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      disabled={pending || !valid}
                      onClick={() => exec(() => act.saveEstimateAction(id, toItems(lines)))}
                    >
                      Save draft
                    </Button>
                  </div>
                </div>
              )}
            </EstimateEditor>
          </Step>
        )}

        {has("sendEstimate") && (
          <Step
            icon={Send}
            title="Review & send the estimate"
            hint="Adjust any line if needed — each edit is counted as a new revision — then send it to the customer."
          >
            <EstimateEditor inventory={p.inventory} initial={p.draft}>
              {(lines, valid) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="h-9"
                    disabled={pending || !valid}
                    onClick={() => exec(() => act.sendEstimateAction(id, toItems(lines)))}
                  >
                    <Send /> Send to customer
                  </Button>
                  {has("returnToTechnician") && (
                    <Button
                      variant="outline"
                      className="h-9"
                      disabled={pending}
                      onClick={() => exec(() => act.returnToTechnicianAction(id))}
                    >
                      <RotateCcw /> Back to technician
                    </Button>
                  )}
                </div>
              )}
            </EstimateEditor>
          </Step>
        )}

        {has("reviseEstimate") && (
          <Step
            icon={RotateCcw}
            title="The customer declined the estimate"
            hint="Revise it yourself, send it back to the technician to re-quote, or cancel the booking."
            tone="red"
          >
            <div className="space-y-2">
              <Input
                placeholder="Note for the technician (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-9"
              />
              <div className="flex flex-wrap gap-2">
                <Button className="h-9" disabled={pending} onClick={() => exec(() => act.reviseEstimateAction(id))}>
                  Revise estimate
                </Button>
                <Button
                  variant="outline"
                  className="h-9"
                  disabled={pending}
                  onClick={() => exec(() => act.returnToTechnicianAction(id, note))}
                >
                  <RotateCcw /> Back to technician
                </Button>
              </div>
            </div>
          </Step>
        )}

        {has("assignParts") && (
          <Step icon={PackageCheck} title="Estimate approved — hand to parts" hint="The parts person checks stock and orders what's missing.">
            <div className="flex flex-wrap gap-2">
              <PersonPicker people={p.partsPeople} value={partsPerson} onChange={setPartsPerson} placeholder="Choose parts person…" />
              <Button
                className="h-9"
                disabled={pending || !partsPerson}
                onClick={() => exec(() => act.assignPartsAction(id, partsPerson))}
              >
                Assign <ArrowRight />
              </Button>
            </div>
          </Step>
        )}

        {has("orderParts") && (
          <Step
            icon={PackageSearch}
            title="Check stock for this job"
            hint="Everything on the shelf gets reserved for this booking. Anything missing goes on a purchase order."
          >
            <div className="space-y-3">
              <RequirementTable rows={p.requirement} />
              {p.requirement.some((r) => r.shortfall > 0) && (
                <Input
                  placeholder="Supplier for the purchase order (optional)"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="h-9 max-w-sm"
                />
              )}
              <Button className="h-9" disabled={pending} onClick={() => exec(() => act.processPartsAction(id, supplier))}>
                {p.requirement.some((r) => r.shortfall > 0) ? (
                  <>
                    <Truck /> Reserve stock & order missing parts
                  </>
                ) : (
                  <>
                    <PackageCheck /> Reserve parts — all in stock
                  </>
                )}
              </Button>
            </div>
          </Step>
        )}

        {p.status === "PARTS_ORDERED" && has("markPartsReady") && (
          <Step
            icon={Truck}
            title="Waiting on delivery"
            hint="Confirm what arrived. A partial delivery keeps the job here until everything is in."
          >
            <div className="space-y-3">
              <RequirementTable rows={p.requirement} />
              {p.canReceive && p.openPOs.map((po) => <ReceiveForm key={po.id} shopId={p.shopId} po={po} />)}
              {p.requirement.every((r) => r.reserved >= r.required || r.onHand >= r.required - r.reserved) && (
                <Button className="h-9" disabled={pending} onClick={() => exec(() => act.markPartsReadyAction(id))}>
                  <PackageCheck /> Mark parts ready
                </Button>
              )}
            </div>
          </Step>
        )}

        {has("allocateParts") && (
          <Step icon={PackageCheck} title="Allocate parts to the job" hint="Hands the reserved parts to the technician and starts the repair.">
            <div className="space-y-3">
              <RequirementTable rows={p.requirement} />
              <Button className="h-9" disabled={pending} onClick={() => exec(() => act.allocatePartsAction(id))}>
                <PackageCheck /> Allocate & release to technician
              </Button>
            </div>
          </Step>
        )}

        {has("sendToQc") && (
          <Step
            icon={ClipboardCheck}
            title={p.openIssues.length ? "Fix the QC issue, then resubmit" : "Finish the repair"}
            hint="When you're done, send it to the shared QC queue."
          >
            <div className="space-y-3">
              {p.openIssues.map((i) => (
                <div key={i.id} className="rounded-lg border border-signal-red/30 bg-signal-red/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-signal-red">
                    <ShieldAlert className="size-4" /> {i.title}
                  </p>
                  {i.description && <p className="mt-1 text-sm text-steel">{i.description}</p>}
                </div>
              ))}
              <Textarea
                placeholder="What did you do? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-16"
              />
              <Button className="h-9" disabled={pending} onClick={() => exec(() => act.sendToQcAction(id, note))}>
                <Send /> Send to QC
              </Button>
            </div>
          </Step>
        )}

        {has("claimQc") && (
          <Step icon={Hand} title="Pick this job from the QC queue" hint="First to pick locks it — nobody else can test it at the same time.">
            <Button className="h-9" disabled={pending} onClick={() => exec(() => act.claimQcAction(id))}>
              <Hand /> Pick job
            </Button>
          </Step>
        )}

        {has("passQc") && (
          <Step icon={ClipboardCheck} title="Quality check" hint="Test the vehicle. Pass it, or log an issue to send it back.">
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {QC_CHECKS.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                      qcChecks[c] ? "border-teal/40 bg-teal/5 text-foreground" : "border-line text-steel",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--teal)]"
                      checked={!!qcChecks[c]}
                      onChange={(e) => setQcChecks((s) => ({ ...s, [c]: e.target.checked }))}
                    />
                    {c}
                  </label>
                ))}
              </div>
              <Textarea placeholder="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" />
              <Button
                className="h-9 bg-teal text-[#04140f] hover:bg-teal/85"
                disabled={pending}
                onClick={() => {
                  const checked = QC_CHECKS.filter((c) => qcChecks[c]);
                  const summary = [checked.length ? `Checked: ${checked.join(", ")}` : "", note].filter(Boolean).join(". ");
                  exec(() => act.passQcAction(id, summary || undefined));
                }}
              >
                <CheckCircle2 /> Pass QC
              </Button>

              <div className="space-y-2 rounded-lg border border-signal-red/25 bg-signal-red/[0.03] p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-signal-red">
                  <XCircle className="size-4" /> Found a problem?
                </p>
                <Input
                  placeholder="Issue title, e.g. Oil leak at the filter"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="h-9"
                />
                <Textarea
                  placeholder="Describe what needs fixing"
                  value={issueBody}
                  onChange={(e) => setIssueBody(e.target.value)}
                  className="min-h-16"
                />
                <Button
                  variant="destructive"
                  className="h-9"
                  disabled={pending || issueTitle.trim().length < 3}
                  onClick={() => exec(() => act.failQcAction(id, issueTitle, issueBody), () => {
                    setIssueTitle("");
                    setIssueBody("");
                  })}
                >
                  <RotateCcw /> Fail QC — return to technician
                </Button>
              </div>
            </div>
          </Step>
        )}

        {has("notifyReady") && (
          <Step icon={Bell} title="Ready for pick-up" hint="Let the customer know, then complete the booking when they collect." tone="teal">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-9" disabled={pending} onClick={() => exec(() => act.notifyReadyAction(id))}>
                <Bell /> Notify customer
              </Button>
              {has("complete") && (
                <Button className="h-9" disabled={pending} onClick={() => exec(() => act.completeBookingAction(id))}>
                  <CheckCircle2 /> Complete — vehicle collected
                </Button>
              )}
            </div>
          </Step>
        )}

        {primary.length === 0 && (
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-steel/10 text-steel">
              <Hand className="size-4" />
            </span>
            <p className="text-sm text-muted-foreground">
              Waiting on <span className="text-foreground">{p.waitingOn.toLowerCase()}</span>. Nothing for you to
              do yet — you can still cancel if the plan changes.
            </p>
          </div>
        )}

        {(has("cancel") || has("decline")) && (
          <div className="border-t border-line/70 pt-4">
            {!showDanger ? (
              <button
                type="button"
                onClick={() => setShowDanger(true)}
                className="text-xs text-muted-foreground transition-colors hover:text-signal-red"
              >
                {has("decline") ? "Decline or cancel this booking…" : "Cancel this booking…"}
              </button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-signal-red">
                  <Ban className="size-3.5" /> Reason (shared with the customer)
                </Label>
                <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" />
                <div className="flex gap-2">
                  {has("decline") && (
                    <Button variant="destructive" className="h-9" disabled={pending} onClick={() => exec(() => act.declineBookingAction(id, reason))}>
                      Decline booking
                    </Button>
                  )}
                  {!has("decline") && (
                    <Button variant="destructive" className="h-9" disabled={pending} onClick={() => exec(() => act.cancelBookingAction(id, reason))}>
                      Cancel booking
                    </Button>
                  )}
                  <Button variant="ghost" className="h-9" onClick={() => setShowDanger(false)}>
                    Keep it
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
