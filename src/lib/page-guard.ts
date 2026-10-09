import "server-only";
import { notFound, redirect } from "next/navigation";
import { isAppError } from "@/lib/errors";

/**
 * For pages: run an access check and turn domain errors into navigation —
 * signed-out → /login (back to here afterwards); forbidden / other tenant → 404,
 * so a guessed ID reveals nothing about another shop.
 */
export async function guard<T>(check: Promise<T>, returnTo?: string): Promise<T> {
  try {
    return await check;
  } catch (e) {
    if (isAppError(e)) {
      if (e.code === "UNAUTHENTICATED") {
        redirect(returnTo ? `/login?callbackUrl=${encodeURIComponent(returnTo)}` : "/login");
      }
      if (e.code === "FORBIDDEN" || e.code === "NOT_FOUND") notFound();
    }
    throw e;
  }
}
