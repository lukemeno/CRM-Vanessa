import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/" || pathname.startsWith("/api/auth");

  if (req.auth && pathname === "/") {
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
