import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth redirect only: if there's no session cookie on a signed-in area, send the
 * visitor to /login with the exact page they asked for, so they land back there afterwards.
 * Real authentication + authorization happen server-side on every page, action and API
 * route (lib/rbac.ts) — this never grants access, it just improves the redirect.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((c) => request.cookies.has(c));
  if (hasSession) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/pos/:path*", "/account/:path*", "/invoice/:path*", "/dashboard"],
};
