import { auth } from "@/auth";
import { isEmailAllowed } from "@/lib/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health";
  const email = req.auth?.user?.email;
  const allowed = Boolean(email && isEmailAllowed(email));

  if (req.auth && !allowed && !isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (allowed && pathname === "/") {
    return NextResponse.redirect(new URL("/heute", req.nextUrl));
  }

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
