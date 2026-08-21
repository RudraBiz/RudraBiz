import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Middleware runs on the Edge runtime, which cannot bundle Prisma or
// bcryptjs (they pull in Node built-ins like node:util/types). So this
// creates a second, edge-safe NextAuth instance from just the shared
// config — no Credentials provider needed here, since middleware only
// ever reads the existing JWT, it never needs to run authorize().
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");
  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/companies") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/companies", req.nextUrl));
  }

  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/companies/:path*", "/settings/:path*", "/login", "/register"],
};
