"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, Loader2, Lock, Mail, User } from "lucide-react";
import { signupOwner, type SignupState } from "@/server/auth-actions";
import { Button } from "@/components/ui/button";
import { AuthField } from "./auth-field";
import { Stagger, StaggerItem } from "./stagger";

/** What happens after this form, so nobody wonders what they just signed up for. */
const NEXT = [
  "Create your shop and set its hours",
  "Add your team by role — advisor, technician, parts, QC",
  "Take bookings from the public directory",
];

export function SignupForm() {
  const reduce = useReducedMotion();
  const [state, action, pending] = useActionState<SignupState, FormData>(signupOwner, undefined);

  return (
    <Stagger className="w-full max-w-md">
      <StaggerItem>
        <h1 className="display text-[clamp(1.9rem,4vw,2.5rem)] text-foreground">
          Put your shop on the board
        </h1>
        <p className="mt-2 text-muted-foreground">
          Set up as an owner. Your shop and your team come next.
        </p>
      </StaggerItem>

      <form action={action} className="mt-8 space-y-5">
        <StaggerItem>
          <AuthField
            label="Your name"
            name="name"
            required
            autoComplete="name"
            icon={<User className="size-4" />}
            placeholder="Fatima Raza"
            disabled={pending}
          />
        </StaggerItem>
        <StaggerItem>
          <AuthField
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            icon={<Mail className="size-4" />}
            placeholder="you@example.com"
            invalid={Boolean(state?.error)}
            disabled={pending}
          />
        </StaggerItem>
        <StaggerItem>
          <AuthField
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            icon={<Lock className="size-4" />}
            placeholder="At least 8 characters"
            hint={<span className="text-xs text-muted-foreground">8 characters or more</span>}
            disabled={pending}
          />
        </StaggerItem>

        {state?.error && (
          <motion.p
            role="alert"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: [-8, 6, -3, 0] }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </motion.p>
        )}

        <StaggerItem>
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="sheen h-12 w-full rounded-xl text-[0.95rem] shadow-lg shadow-amber/20 transition-transform disabled:opacity-100 not-disabled:hover:-translate-y-0.5"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating your account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </StaggerItem>
      </form>

      <StaggerItem>
        <ol className="mt-8 rounded-2xl border border-line bg-surface/60 p-4">
          <h2 className="text-sm text-foreground">What happens next</h2>
          {NEXT.map((step, i) => (
            <li key={step} className="mt-3 flex gap-3 text-sm text-muted-foreground">
              <span className="readout mt-px text-xs text-amber-ink">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </StaggerItem>

      <StaggerItem>
        <p className="mt-7 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-amber-ink underline decoration-amber/40 underline-offset-4 transition-colors hover:decoration-amber"
          >
            Sign in
          </Link>
        </p>
      </StaggerItem>
    </Stagger>
  );
}
