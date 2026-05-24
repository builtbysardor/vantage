import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("vantage_token")?.value;

  const pub = pathname.startsWith("/login") || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico";
  if (pub) return NextResponse.next();

  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
