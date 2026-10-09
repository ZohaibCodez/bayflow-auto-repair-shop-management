"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupOwner, type SignupState } from "@/server/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(
    signupOwner,
    undefined,
  );

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-3xl text-foreground">Create your shop account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Set up as an owner. You&rsquo;ll add shops and your team next.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required placeholder="Fatima Raza" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
          />
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-amber hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
