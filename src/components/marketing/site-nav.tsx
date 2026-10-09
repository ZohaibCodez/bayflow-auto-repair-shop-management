import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavShell } from "@/components/marketing/nav-shell";
import { getCurrentUser } from "@/lib/rbac";

/** Reads the session on the server; `NavShell` owns everything interactive. */
export async function SiteNav() {
  const user = await getCurrentUser();
  return (
    <NavShell
      authSlot={
        <Button
          render={<Link href={user ? "/dashboard" : "/login"} />}
          variant="ghost"
          size="sm"
          className="h-9 rounded-lg px-3"
        >
          {user ? "Dashboard" : "Sign in"}
        </Button>
      }
    />
  );
}
