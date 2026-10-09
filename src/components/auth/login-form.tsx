"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Seeded demo accounts (see README / prisma/seed.ts). UI convenience only — no auth logic.
const DEMO = [
  { label: "Owner", email: "owner@bayflow.test" },
  { label: "Advisor", email: "sa.lahore@bayflow.test" },
  { label: "Technician", email: "tech.lahore@bayflow.test" },
  { label: "Parts", email: "parts.lahore@bayflow.test" },
  { label: "QC", email: "qc.lahore@bayflow.test" },
  { label: "Customer", email: "customer@bayflow.test" },
];

/** Only same-site relative paths are allowed as a post-login destination. */
const safeCallback = (url?: string) =>
  url && url.startsWith("/") && !url.startsWith("//") ? url : "/dashboard";

export function LoginForm({ registered, callbackUrl }: { registered?: boolean; callbackUrl?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("That email and password don't match an account.");
    else window.location.href = safeCallback(callbackUrl);
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-3xl text-foreground">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to your BayFlow account.
      </p>

      {registered && (
        <p className="mt-6 rounded-md border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal">
          Account created. Sign in to continue.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-line bg-surface p-4">
        <p className="text-xs text-muted-foreground">
          Judging BayFlow? Fill a demo account — password{" "}
          <span className="font-mono text-foreground">password123</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword("password123");
              }}
              className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-steel transition-colors hover:border-amber/40 hover:text-foreground"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        New shop owner?{" "}
        <Link href="/signup" className="text-amber hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
