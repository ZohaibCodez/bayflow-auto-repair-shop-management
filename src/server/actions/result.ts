import { ZodError } from "zod";
import { isAppError } from "@/lib/errors";

/** What every server action returns to the client: a toast-able message either way. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

/** Run an action body; map domain/validation errors to a friendly `{ ok: false, error }`. */
export async function run<T>(
  fn: () => Promise<T>,
  message?: string,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, message, data };
  } catch (e) {
    if (isAppError(e)) return { ok: false, error: e.message };
    if (e instanceof ZodError) {
      return { ok: false, error: e.issues[0]?.message ?? "Please check the form." };
    }
    // Let Next.js navigation (redirect/notFound) propagate.
    if (e instanceof Error && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_")) {
      throw e;
    }
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
