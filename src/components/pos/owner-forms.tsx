"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, UserPlus } from "lucide-react";
import type { StaffRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/use-action";
import {
  addTeamMemberAction,
  createShopAction,
  setServiceActiveAction,
  updateMemberAction,
  updateShopAction,
  upsertServiceAction,
} from "@/server/actions/shop";

export const ROLE_LABEL: Record<StaffRole, string> = {
  SERVICE_ADVISOR: "Service advisor",
  TECHNICIAN: "Technician",
  QC: "QC inspector",
  PARTS: "Parts person",
};
const ROLES = Object.keys(ROLE_LABEL) as StaffRole[];

function F({ id, label, children, className }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-steel">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export function AddMemberForm({ shopId }: { shopId: string }) {
  const { pending, exec } = useAction();
  const empty = { name: "", email: "", role: "TECHNICIAN" as StaffRole, password: "" };
  const [f, setF] = useState(empty);
  return (
    <div className="panel space-y-4 p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-amber" />
        <p className="text-sm font-medium text-foreground">Add a team member</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Staff can&rsquo;t sign themselves up — you create their login here and hand it to them. If the email already has a
        BayFlow account (e.g. they work at another shop), the role is added to that account.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <F id="m-name" label="Name">
          <Input id="m-name" className="h-9" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </F>
        <F id="m-email" label="Email">
          <Input id="m-email" type="email" className="h-9" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </F>
        <F id="m-role" label="Role">
          <NativeSelect id="m-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </NativeSelect>
        </F>
        <F id="m-pass" label="Temporary password">
          <Input
            id="m-pass"
            type="text"
            autoComplete="off"
            className="h-9"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            placeholder="At least 8 characters"
          />
        </F>
      </div>
      <Button className="h-9" disabled={pending} onClick={() => exec(() => addTeamMemberAction(shopId, f), () => setF(empty))}>
        <Plus /> Add to team
      </Button>
    </div>
  );
}

export function MemberControls({
  shopId,
  membershipId,
  role,
  active,
}: {
  shopId: string;
  membershipId: string;
  role: StaffRole;
  active: boolean;
}) {
  const { pending, exec } = useAction();
  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label="Role"
        value={role}
        disabled={pending || !active}
        onChange={(e) => exec(() => updateMemberAction(shopId, { membershipId, role: e.target.value as StaffRole }))}
        className="w-40"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </NativeSelect>
      <Button
        variant={active ? "outline" : "secondary"}
        className="h-9"
        disabled={pending}
        onClick={() => exec(() => updateMemberAction(shopId, { membershipId, active: !active }))}
      >
        {active ? "Deactivate" : "Reactivate"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

type ServiceRow = { id?: string; name: string; description: string | null; durationMin: number; basePrice: number | null };

export function ServiceEditor({ shopId, service, onDone }: { shopId: string; service?: ServiceRow; onDone?: () => void }) {
  const { pending, exec } = useAction();
  const [f, setF] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMin: String(service?.durationMin ?? 60),
    basePrice: service?.basePrice != null ? String(service.basePrice) : "",
  });
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1.6fr_100px_120px_auto] sm:items-end">
      <F id={`s-name-${service?.id ?? "new"}`} label="Name">
        <Input id={`s-name-${service?.id ?? "new"}`} className="h-9" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </F>
      <F id={`s-desc-${service?.id ?? "new"}`} label="Description">
        <Input
          id={`s-desc-${service?.id ?? "new"}`}
          className="h-9"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </F>
      <F id={`s-dur-${service?.id ?? "new"}`} label="Minutes">
        <Input
          id={`s-dur-${service?.id ?? "new"}`}
          type="number"
          className="h-9"
          value={f.durationMin}
          onChange={(e) => setF({ ...f, durationMin: e.target.value })}
        />
      </F>
      <F id={`s-price-${service?.id ?? "new"}`} label="From (PKR)">
        <Input
          id={`s-price-${service?.id ?? "new"}`}
          type="number"
          className="h-9"
          value={f.basePrice}
          onChange={(e) => setF({ ...f, basePrice: e.target.value })}
          placeholder="optional"
        />
      </F>
      <Button
        className="h-9"
        disabled={pending}
        onClick={() =>
          exec(
            () =>
              upsertServiceAction(shopId, {
                id: service?.id,
                name: f.name,
                description: f.description || undefined,
                durationMin: Number(f.durationMin),
                basePrice: f.basePrice === "" ? undefined : Number(f.basePrice),
              }),
            () => {
              if (!service) setF({ name: "", description: "", durationMin: "60", basePrice: "" });
              onDone?.();
            },
          )
        }
      >
        {service ? "Save" : (
          <>
            <Plus /> Add
          </>
        )}
      </Button>
    </div>
  );
}

export function ServiceRowControls({ shopId, service, active }: { shopId: string; service: ServiceRow & { id: string }; active: boolean }) {
  const { pending, exec } = useAction();
  const [editing, setEditing] = useState(false);
  if (editing) return <ServiceEditor shopId={shopId} service={service} onDone={() => setEditing(false)} />;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon-lg" aria-label={`Edit ${service.name}`} onClick={() => setEditing(true)}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={active ? `Hide ${service.name}` : `Show ${service.name}`}
        title={active ? "Hide from booking" : "Offer for booking"}
        disabled={pending}
        onClick={() => exec(() => setServiceActiveAction(shopId, service.id, !active))}
      >
        {active ? <Eye /> : <EyeOff />}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shop details (create + settings)
// ---------------------------------------------------------------------------

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;
type DayKey = (typeof DAYS)[number][0];
type Hours = Record<DayKey, { open: string; close: string } | null>;

export type ShopFormValues = {
  name: string;
  address: string;
  city: string;
  phone: string;
  description: string;
  slotDurationMin: number;
  slotCapacity: number;
  workingHours: Hours;
};

const DEFAULT_HOURS: Hours = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: { open: "10:00", close: "16:00" },
  sun: null,
};

export function ShopForm({ shopId, initial }: { shopId?: string; initial?: ShopFormValues }) {
  const { pending, exec } = useAction();
  const [f, setF] = useState<ShopFormValues>(
    initial ?? {
      name: "",
      address: "",
      city: "",
      phone: "",
      description: "",
      slotDurationMin: 60,
      slotCapacity: 2,
      workingHours: DEFAULT_HOURS,
    },
  );
  const [starter, setStarter] = useState(true);
  const setDay = (d: DayKey, v: { open: string; close: string } | null) =>
    setF({ ...f, workingHours: { ...f.workingHours, [d]: v } });

  const submit = () => {
    const payload = { ...f, description: f.description || undefined };
    exec(() => (shopId ? updateShopAction(shopId, payload) : createShopAction({ ...payload, starterServices: starter })));
  };

  return (
    <div className="space-y-6">
      <section className="panel space-y-4 p-5">
        <p className="eyebrow">Shop</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="shop-name" label="Shop name">
            <Input id="shop-name" className="h-10" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Lahore Auto Care" />
          </F>
          <F id="shop-phone" label="Phone">
            <Input id="shop-phone" className="h-10" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+92 42 111 222 333" />
          </F>
          <F id="shop-address" label="Address">
            <Input id="shop-address" className="h-10" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </F>
          <F id="shop-city" label="City">
            <Input id="shop-city" className="h-10" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </F>
          <F id="shop-desc" label="Short description (shown to customers)" className="sm:col-span-2">
            <Textarea id="shop-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-16" />
          </F>
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <p className="eyebrow">Booking slots</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="slot-dur" label="Slot length">
            <NativeSelect id="slot-dur" value={f.slotDurationMin} onChange={(e) => setF({ ...f, slotDurationMin: Number(e.target.value) })}>
              {[30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </NativeSelect>
          </F>
          <F id="slot-cap" label="Cars per slot (bays)">
            <Input id="slot-cap" type="number" min={1} max={20} className="h-9" value={f.slotCapacity} onChange={(e) => setF({ ...f, slotCapacity: Number(e.target.value) })} />
          </F>
        </div>
        <div className="divide-y divide-line/70 rounded-lg border border-line">
          {DAYS.map(([d, label]) => {
            const h = f.workingHours[d];
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <label className="flex w-36 items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--amber)]"
                    checked={!!h}
                    onChange={(e) => setDay(d, e.target.checked ? { open: "09:00", close: "18:00" } : null)}
                  />
                  {label}
                </label>
                {h ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Input type="time" className="h-8 w-28" value={h.open} onChange={(e) => setDay(d, { ...h, open: e.target.value })} aria-label={`${label} opens`} />
                    <span className="text-muted-foreground">to</span>
                    <Input type="time" className="h-8 w-28" value={h.close} onChange={(e) => setDay(d, { ...h, close: e.target.value })} aria-label={`${label} closes`} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {!shopId && (
        <label className="flex items-center gap-2 text-sm text-steel">
          <input type="checkbox" className="size-4 accent-[var(--amber)]" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
          Start with a standard service menu (oil change, brakes, diagnostics, tyres) — you can edit it later
        </label>
      )}

      <Button className="h-11 px-6" disabled={pending} onClick={submit}>
        {shopId ? "Save changes" : "Create shop"}
      </Button>
    </div>
  );
}
