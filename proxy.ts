import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/create", "/settings", "/edit", "/lab/new"];

const hasSupabaseAuthCookie = (request: NextRequest) =>
  request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("auth-token") && cookie.value.length > 0);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (hasSupabaseAuthCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/", request.url);
  loginUrl.searchParams.set("auth", "required");
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/create/:path*", "/settings/:path*", "/edit/:path*", "/lab/new/:path*"],
};

