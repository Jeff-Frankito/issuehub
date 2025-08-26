// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIXES = ["/login", "/register", "/api/auth", "/api/health"];
const STATIC_PREFIXES = ["/_next", "/images", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isStatic(pathname: string) {
  if (STATIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (/\.[^/]+$/.test(pathname)) return true; // files with extensions
  return false;
}

function isPublic(pathname: string) {
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return false;
}

function nextWithTrace(req: NextRequest, token: any | null) {
  const headers = new Headers(req.headers);
  headers.set("x-method", req.method);
  headers.set("x-pathname", req.nextUrl.pathname);
  if (token?.uid != null) headers.set("x-user-id", String(token.uid));
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Always allow NextAuth, static, and public pages
  if (isPublic(pathname) || isStatic(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return nextWithTrace(req, token);
  }

  // Gate everything else
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token) return nextWithTrace(req, token);

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + (search || ""));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
