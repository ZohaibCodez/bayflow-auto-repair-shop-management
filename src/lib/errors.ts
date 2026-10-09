/**
 * One error type for every expected failure in the domain layer. Server actions turn it
 * into `{ ok: false, error }`, route handlers into a JSON body with the matching HTTP status.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "VALIDATION";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  CONFLICT: 409,
  VALIDATION: 422,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

export const unauthenticated = (msg = "Please sign in to continue.") =>
  new AppError("UNAUTHENTICATED", msg);
export const forbidden = (msg = "You don't have permission to do that.") =>
  new AppError("FORBIDDEN", msg);
export const notFound = (msg = "Not found.") => new AppError("NOT_FOUND", msg);
export const conflict = (msg: string) => new AppError("CONFLICT", msg);
export const invalid = (msg: string) => new AppError("VALIDATION", msg);
