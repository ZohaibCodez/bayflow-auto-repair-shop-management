import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "@/lib/errors";

/**
 * Wrap a route handler so every failure becomes a consistent JSON error with the right
 * status: 401 unauthenticated · 403 forbidden · 404 not found / other tenant ·
 * 409 invalid transition or conflict · 422 validation.
 */
export function apiRoute<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (isAppError(e)) {
        return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: { code: "VALIDATION", message: e.issues[0]?.message ?? "Invalid request", issues: e.issues } },
          { status: 422 },
        );
      }
      console.error(e);
      return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });
    }
  };
}
