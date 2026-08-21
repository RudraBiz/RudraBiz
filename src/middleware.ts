import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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
