"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  CarFront,
  Check,
  ClipboardList,
  Loader2,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  Store,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField } from "./auth-field";
import { Stagger, StaggerItem } from "./stagger";

// Seeded demo accounts (see README / prisma/seed.ts). UI convenience only — no auth logic.
const DEMO: { label: string; email: string; icon: LucideIcon; lands: string }[] = [
  { label: "Owner", email: "owner@bayflow.test", icon: Store, lands: "Three shops" },
  { label: "Advisor", email: "sa.lahore@bayflow.test", icon: ClipboardList, lands: "Front desk" },
  { label: "Technician", email: "tech.lahore@bayflow.test", icon: Wrench, lands: "Your bay" },
  { label: "Parts", email: "parts.lahore@bayflow.test", icon: Package, lands: "Store room" },
  { label: "QC", email: "qc.lahore@bayflow.test", icon: ShieldCheck, lands: "Sign-off" },
  { label: "Customer", email: "customer@bayflow.test", icon: CarFront, lands: "Your car" },
];

const DEMO_PASSWORD = "password123";

/** Only same-site relative paths are allowed as a post-login destination. */
const safeCallback = (url?: string) =>
  url && url.startsWith("/") && !url.startsWith("//") ? url : "/dashboard";

export function LoginForm({
  registered,
  callbackUrl,
}: {
  registered?: boolean;
  callbackUrl?: string;
}) {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** idle → working (with the role being used, if any) → done, then we navigate. */
  const [phase, setPhase] = useState<"idle" | "working" | "done">("idle");
  const [asRole, setAsRole] = useState<string | null>(null);
  const busy = phase !== "idle";

  async function attempt(withEmail: string, withPassword: string) {
    setPhase("working");
    setError(null);
    const res = await signIn("credentials", {
      email: withEmail,
      password: withPassword,
      redirect: false,
    });
    if (res?.error) {
      setPhase("idle");
      setAsRole(null);
      setError("That email and password don't match an account.");
      return;
    }
    // A full navigation, not a client-side push: the new session cookie has to
    // reach the server so the destination renders as the signed-in user.
    setPhase("done");
    window.location.assign(safeCallback(callbackUrl));
  }

  /** One click for judges: fill the fields visibly, then sign in. */
  async function signInAs(demo: (typeof DEMO)[number]) {
    if (busy) return;
    setAsRole(demo.label);
    setEmail(demo.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
    await new Promise((r) => setTimeout(r, reduce ? 0 : 420));
    await attempt(demo.email, DEMO_PASSWORD);
  }

  return (
    <Stagger className="w-full max-w-md">
      <StaggerItem>
        <h1 className="display text-[clamp(1.9rem,4vw,2.5rem)] text-foreground">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">Sign in to pick up where the shop left off.</p>
      </StaggerItem>

      {registered && (
        <StaggerItem>
          <p className="mt-6 flex items-center gap-2.5 rounded-xl border border-teal/30 bg-teal/10 px-3.5 py-3 text-sm text-teal-ink">
            <Check className="size-4 shrink-0" />
            Account created. Sign in to continue.
          </p>
        </StaggerItem>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setAsRole(null);
          void attempt(email, password);
        }}
        className="mt-8 space-y-5"
      >
        <StaggerItem>
          <AuthField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            icon={<Mail className="size-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            invalid={Boolean(error)}
            disabled={busy}
          />
        </StaggerItem>

        <StaggerItem>
          <AuthField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            icon={<Lock className="size-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            invalid={Boolean(error)}
            disabled={busy}
          />
        </StaggerItem>

        {error && (
          <motion.p
            role="alert"
            // A short nudge, not a cartoon shake — enough to pull the eye back.
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: [-8, 6, -3, 0] }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </motion.p>
        )}

        <StaggerItem>
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="sheen h-12 w-full rounded-xl text-[0.95rem] shadow-lg shadow-amber/20 transition-transform disabled:opacity-100 not-disabled:hover:-translate-y-0.5"
          >
            {phase === "done" ? (
              <>
                <Check className="size-4" />
                Signed in
              </>
            ) : phase === "working" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {asRole ? `Signing in as ${asRole}…` : "Signing in…"}
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </StaggerItem>
      </form>

      {/* ---- Demo accounts ------------------------------------------------
          The judge's front door. One click fills the form and signs in, and
          each role says where it lands so the choice is informed. */}
      <StaggerItem>
        <section className="mt-8 rounded-2xl border border-line bg-surface/60 p-4">
          <h2 className="text-sm text-foreground">Judging BayFlow?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in as any role — each one sees a different board. Password is{" "}
            <span className="readout text-foreground">{DEMO_PASSWORD}</span>.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO.map((d) => {
              const Icon = d.icon;
              const active = asRole === d.label;
              return (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => void signInAs(d)}
                  disabled={busy}
                  className={`group/demo flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors disabled:opacity-60 ${
                    active
                      ? "border-amber/50 bg-amber/10"
                      : "border-line bg-surface hover:border-amber/35 hover:bg-surface-2"
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg transition-colors ${
                      active
                        ? "bg-amber/20 text-amber-ink"
                        : "bg-surface-2 text-steel group-hover/demo:text-amber-ink"
                    }`}
                  >
                    {active && phase === "working" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-foreground">{d.label}</span>
                    <span className="block truncate text-[0.68rem] text-muted-foreground">
                      {d.lands}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </StaggerItem>

      <StaggerItem>
        <p className="mt-7 text-sm text-muted-foreground">
          New shop owner?{" "}
          <Link
            href="/signup"
            className="text-amber-ink underline decoration-amber/40 underline-offset-4 transition-colors hover:decoration-amber"
          >
            Create an account
          </Link>
        </p>
      </StaggerItem>
    </Stagger>
  );
}
