"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  Clock,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  User,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/money";
import { formatLongDay } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBookingAction } from "@/server/actions/customer";

type Service = { id: string; name: string; description: string | null; durationMin: number; basePrice: number | null };
type Day = { key: string; weekday: string; day: string; month: string; open: boolean };
type Vehicle = { id: string; plate: string; make: string; model: string; year: number };
type Slot = { startsAt: string; label: string; remaining: number };

export type WizardProps = {
  shop: { id: string; name: string; city: string; address: string; rating: number | null };
  services: Service[];
  days: Day[];
  user: { name: string; email: string } | null;
  vehicles: Vehicle[];
};

const STEPS = [
  { key: "services", label: "Service", icon: Wrench },
  { key: "time", label: "Time", icon: CalendarDays },
  { key: "details", label: "Details", icon: User },
  { key: "review", label: "Confirm", icon: ShieldCheck },
] as const;

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error((await r.json()).error ?? "Couldn't load times");
    return r.json() as Promise<{ slots: Slot[] }>;
  });

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-steel">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-signal-red">{error}</p>}
    </div>
  );
}

export function BookingWizard({ shop, services, days, user, vehicles }: WizardProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [picked, setPicked] = useState<string[]>([]);
  const [problems, setProblems] = useState("");
  // Step 2
  const firstOpen = days.find((d) => d.open)?.key ?? days[0]?.key;
  const [dateKey, setDateKey] = useState(firstOpen);
  const [slot, setSlot] = useState<Slot | null>(null);
  // Step 3
  const [person, setPerson] = useState({ name: "", email: "", phone: "", password: "" });
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id ?? "new");
  const [car, setCar] = useState({ plate: "", make: "", model: "", year: "", color: "", mileage: "" });
  const [touched, setTouched] = useState(false);

  const { data, isLoading, error } = useSWR(
    dateKey ? `/api/shops/${shop.id}/availability?date=${dateKey}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const selected = services.filter((s) => picked.includes(s.id));
  const fromPrice = selected.reduce((s, x) => s + (x.basePrice ?? 0), 0);
  const duration = selected.reduce((s, x) => s + x.durationMin, 0);

  const detailErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!user) {
      if (person.name.trim().length < 2) e.name = "Enter your name";
      if (!/^\S+@\S+\.\S+$/.test(person.email)) e.email = "Enter a valid email";
      if (person.password.length < 8) e.password = "At least 8 characters";
    }
    if (vehicleId === "new") {
      if (car.plate.trim().length < 2) e.plate = "Enter the registration number";
      if (!car.make.trim()) e.make = "Enter the make";
      if (!car.model.trim()) e.model = "Enter the model";
      const y = Number(car.year);
      if (!y || y < 1950 || y > new Date().getFullYear() + 1) e.year = "Enter a valid year";
    }
    return e;
  }, [user, person, vehicleId, car]);

  const canNext = [picked.length > 0, !!slot, Object.keys(detailErrors).length === 0, true][step];

  function go(to: number) {
    setDir(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  function next() {
    if (step === 2 && !canNext) {
      setTouched(true);
      return;
    }
    if (canNext) go(step + 1);
  }

  async function confirm() {
    if (!slot) return;
    setSubmitting(true);
    const res = await createBookingAction({
      shopId: shop.id,
      serviceIds: picked,
      problems,
      startsAt: slot.startsAt,
      customer: user ? undefined : { ...person, phone: person.phone || undefined },
      vehicle:
        vehicleId === "new"
          ? {
              kind: "new",
              plate: car.plate,
              make: car.make,
              model: car.model,
              year: Number(car.year),
              color: car.color || undefined,
              mileage: car.mileage ? Number(car.mileage) : undefined,
            }
          : { kind: "existing", vehicleId },
    });
    if (res.ok && res.data) {
      router.push(`/account/bookings/${res.data.bookingId}?booked=1`);
      router.refresh();
    } else {
      setSubmitting(false);
      toast.error(res.ok ? "Something went wrong." : res.error);
      if (!res.ok && /slot|time/i.test(res.error)) {
        setSlot(null);
        go(1);
      }
    }
  }

  const err = (k: string) => (touched ? detailErrors[k] : undefined);
  const vehicleLabel =
    vehicleId === "new"
      ? car.make || car.model
        ? `${car.year} ${car.make} ${car.model}`.trim()
        : null
      : (() => {
          const v = vehicles.find((x) => x.id === vehicleId);
          return v ? `${v.year} ${v.make} ${v.model}` : null;
        })();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {/* Stepper */}
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && go(i)}
                  className="group w-full text-left disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "block h-1 rounded-full transition-colors duration-500",
                      done ? "bg-amber/60" : active ? "bg-amber" : "bg-line",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-2.5 flex items-center gap-1.5 text-xs sm:text-sm",
                      active ? "text-foreground" : done ? "text-steel group-hover:text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {done ? <Check className="size-3.5 text-amber" /> : <s.icon className="size-3.5" />}
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 * dir }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <section>
                <h2 className="font-display text-2xl text-foreground sm:text-3xl">What does your car need?</h2>
                <p className="mt-2 text-muted-foreground">Pick one or more. Not sure? Describe the problem below.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {services.map((s) => {
                    const on = picked.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                        aria-pressed={on}
                        className={cn(
                          "relative rounded-xl border p-4 text-left transition-all duration-200",
                          on
                            ? "border-amber/60 bg-amber/[0.07] shadow-[0_0_0_1px_var(--amber)_inset]"
                            : "border-line bg-surface hover:border-steel/40 hover:bg-surface-2/60",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-4 right-4 grid size-5 place-items-center rounded-full border transition-colors",
                            on ? "border-amber bg-amber text-[#1a1205]" : "border-line",
                          )}
                        >
                          {on && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <p className="pr-8 font-medium text-foreground">{s.name}</p>
                        {s.description && <p className="mt-1 pr-6 text-sm text-muted-foreground">{s.description}</p>}
                        <p className="mt-3 flex items-center gap-3 text-xs text-steel">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" /> ~{s.durationMin} min
                          </span>
                          {s.basePrice != null && <span>from {formatPKR(s.basePrice)}</span>}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 space-y-2">
                  <Label htmlFor="problems" className="text-steel">
                    Tell the shop what&rsquo;s happening <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="problems"
                    value={problems}
                    onChange={(e) => setProblems(e.target.value)}
                    maxLength={2000}
                    placeholder="e.g. Light came on yesterday, car vibrates at idle."
                    className="min-h-24"
                  />
                </div>
              </section>
            )}

            {step === 1 && (
              <section>
                <h2 className="font-display text-2xl text-foreground sm:text-3xl">Pick a time</h2>
                <p className="mt-2 text-muted-foreground">Only open slots are shown — times are local to the shop.</p>
                <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-2">
                  {days.map((d) => {
                    const on = d.key === dateKey;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        disabled={!d.open}
                        onClick={() => {
                          setDateKey(d.key);
                          setSlot(null);
                        }}
                        className={cn(
                          "flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 transition-all",
                          on
                            ? "border-amber bg-amber text-[#1a1205]"
                            : d.open
                              ? "border-line bg-surface text-foreground hover:border-steel/40"
                              : "border-line/50 text-muted-foreground/40 line-through",
                        )}
                      >
                        <span className={cn("text-[11px] uppercase", on ? "text-[#1a1205]/70" : "text-muted-foreground")}>
                          {d.weekday}
                        </span>
                        <span className="font-display-md text-xl leading-tight">{d.day}</span>
                        <span className={cn("text-[11px]", on ? "text-[#1a1205]/70" : "text-muted-foreground")}>{d.month}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6">
                  {isLoading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2/70" />
                      ))}
                    </div>
                  ) : error ? (
                    <p className="text-sm text-signal-red">{(error as Error).message}</p>
                  ) : data?.slots.length ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {data.slots.map((s) => {
                        const on = slot?.startsAt === s.startsAt;
                        return (
                          <button
                            key={s.startsAt}
                            type="button"
                            onClick={() => setSlot(s)}
                            className={cn(
                              "rounded-xl border px-3 py-2.5 text-center transition-all",
                              on
                                ? "border-amber bg-amber/10 text-amber shadow-[0_0_0_1px_var(--amber)_inset]"
                                : "border-line bg-surface text-foreground hover:border-steel/40",
                            )}
                          >
                            <span className="block font-display-md text-lg tabular">{s.label}</span>
                            <span className={cn("block text-[11px]", s.remaining === 1 ? "text-amber" : "text-muted-foreground")}>
                              {s.remaining === 1 ? "last spot" : `${s.remaining} spots`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted-foreground">
                      No open slots on this day — try another date.
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-8">
                <div>
                  <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                    {user ? "Which car is it?" : "Your details"}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {user ? (
                      <>
                        Booking as <span className="text-foreground">{user.name}</span> ({user.email}).
                      </>
                    ) : (
                      <>
                        We&rsquo;ll create your BayFlow account so you can track the repair and approve the estimate. Already
                        booked with us?{" "}
                        <Link href={`/login?callbackUrl=/book/${shop.id}`} className="text-amber hover:underline">
                          Sign in
                        </Link>{" "}
                        or use the same email and password.
                      </>
                    )}
                  </p>
                </div>

                {!user && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="name" label="Full name" error={err("name")}>
                      <Input id="name" className="h-10" autoComplete="name" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} />
                    </Field>
                    <Field id="phone" label="Phone (optional)">
                      <Input id="phone" className="h-10" autoComplete="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} placeholder="+92 3xx xxxxxxx" />
                    </Field>
                    <Field id="email" label="Email" error={err("email")}>
                      <Input id="email" type="email" className="h-10" autoComplete="email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
                    </Field>
                    <Field id="password" label="Password" error={err("password")}>
                      <Input id="password" type="password" className="h-10" autoComplete="new-password" value={person.password} onChange={(e) => setPerson({ ...person, password: e.target.value })} placeholder="At least 8 characters" />
                    </Field>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="eyebrow flex items-center gap-1.5">
                    <Car className="size-3" /> Vehicle
                  </p>
                  {vehicles.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {vehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVehicleId(v.id)}
                          className={cn(
                            "rounded-xl border p-3 text-left transition-colors",
                            vehicleId === v.id ? "border-amber/60 bg-amber/[0.07]" : "border-line bg-surface hover:border-steel/40",
                          )}
                        >
                          <p className="text-sm text-foreground">
                            {v.year} {v.make} {v.model}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">{v.plate}</p>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVehicleId("new")}
                        className={cn(
                          "rounded-xl border border-dashed p-3 text-left text-sm transition-colors",
                          vehicleId === "new" ? "border-amber/60 text-foreground" : "border-line text-muted-foreground hover:text-foreground",
                        )}
                      >
                        + A different car
                      </button>
                    </div>
                  )}
                  {vehicleId === "new" && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field id="plate" label="Registration no." error={err("plate")}>
                        <Input id="plate" className="h-10 font-mono uppercase" value={car.plate} onChange={(e) => setCar({ ...car, plate: e.target.value })} placeholder="LEA-1234" />
                      </Field>
                      <Field id="make" label="Make" error={err("make")}>
                        <Input id="make" className="h-10" value={car.make} onChange={(e) => setCar({ ...car, make: e.target.value })} placeholder="Honda" />
                      </Field>
                      <Field id="model" label="Model" error={err("model")}>
                        <Input id="model" className="h-10" value={car.model} onChange={(e) => setCar({ ...car, model: e.target.value })} placeholder="Civic" />
                      </Field>
                      <Field id="year" label="Year" error={err("year")}>
                        <Input id="year" type="number" inputMode="numeric" className="h-10" value={car.year} onChange={(e) => setCar({ ...car, year: e.target.value })} placeholder="2016" />
                      </Field>
                      <Field id="color" label="Colour (optional)">
                        <Input id="color" className="h-10" value={car.color} onChange={(e) => setCar({ ...car, color: e.target.value })} />
                      </Field>
                      <Field id="mileage" label="Mileage km (optional)">
                        <Input id="mileage" type="number" inputMode="numeric" className="h-10" value={car.mileage} onChange={(e) => setCar({ ...car, mileage: e.target.value })} />
                      </Field>
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === 3 && slot && (
              <section>
                <h2 className="font-display text-2xl text-foreground sm:text-3xl">Look right?</h2>
                <p className="mt-2 text-muted-foreground">
                  Nothing is charged now. The shop inspects your car and sends an itemised estimate — no work starts until you approve it.
                </p>
                <dl className="panel mt-6 divide-y divide-line/70">
                  {[
                    ["Shop", `${shop.name}, ${shop.city}`, 0],
                    ["When", `${formatLongDay(new Date(slot.startsAt))} at ${slot.label}`, 1],
                    ["Services", selected.map((s) => s.name).join(", "), 0],
                    ["Your notes", problems || "—", 0],
                    ["Vehicle", vehicleLabel ?? "—", 2],
                    ["Name", user ? user.name : person.name, 2],
                    ["Email", user ? user.email : person.email, 2],
                  ].map(([k, v, back]) => (
                    <div key={k as string} className="flex items-start justify-between gap-4 px-4 py-3">
                      <dt className="w-24 shrink-0 text-sm text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 flex-1 text-sm text-foreground">{v}</dd>
                      <button type="button" onClick={() => go(back as number)} className="text-xs text-amber hover:underline">
                        Edit
                      </button>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
          {step > 0 ? (
            <Button variant="ghost" className="h-11 px-4" onClick={() => go(step - 1)} disabled={submitting}>
              <ArrowLeft /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button className="h-11 px-6" onClick={next} disabled={step !== 2 && !canNext}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button className="h-11 px-6" onClick={confirm} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Booking…
                </>
              ) : (
                <>
                  Confirm booking <Check />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="panel overflow-hidden">
          <div className="relative border-b border-line p-5">
            <div className="pointer-events-none absolute inset-0 amber-glow opacity-70" aria-hidden />
            <p className="eyebrow relative">Booking at</p>
            <p className="relative mt-1 font-display-md text-xl text-foreground">{shop.name}</p>
            <p className="relative mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {shop.address}, {shop.city}
            </p>
            {shop.rating && (
              <p className="relative mt-1 flex items-center gap-1 text-sm text-steel">
                <Star className="size-3.5 fill-amber text-amber" /> {shop.rating.toFixed(1)}
              </p>
            )}
          </div>
          <div className="space-y-4 p-5 text-sm">
            <div>
              <p className="eyebrow mb-1.5">Services</p>
              {selected.length ? (
                <ul className="space-y-1">
                  {selected.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2 text-foreground">
                      <span>{s.name}</span>
                      {s.basePrice != null && <span className="text-steel tabular">{formatPKR(s.basePrice)}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground/70">Nothing picked yet</p>
              )}
            </div>
            <div>
              <p className="eyebrow mb-1.5">Time</p>
              <p className={slot ? "text-foreground" : "text-muted-foreground/70"}>
                {slot ? `${formatLongDay(new Date(slot.startsAt))}, ${slot.label}` : "Not picked yet"}
              </p>
            </div>
            <div>
              <p className="eyebrow mb-1.5">Vehicle</p>
              <p className={vehicleLabel ? "text-foreground" : "text-muted-foreground/70"}>{vehicleLabel ?? "Not added yet"}</p>
            </div>
            {selected.length > 0 && (
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-muted-foreground">
                  Starting from{duration ? ` · ~${Math.round(duration / 15) * 15} min` : ""}
                </span>
                <span className="font-display-md text-lg text-foreground tabular">{formatPKR(fromPrice)}</span>
              </div>
            )}
            <p className="flex items-start gap-2 rounded-lg bg-surface-2/70 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-4 shrink-0 text-teal" />
              You approve an itemised estimate before any work begins.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
