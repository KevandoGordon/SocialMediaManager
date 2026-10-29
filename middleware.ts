import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/signup"];

/** Sends visitors without a session cookie to sign in. The API still verifies the session on every call. */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.includes(pathname) || req.cookies.has("sc_session")) return NextResponse.next();
  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"] };
