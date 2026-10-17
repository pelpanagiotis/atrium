import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = ["/home", "/projects", "/tasks", "/calendar", "/schedule", "/integrations", "/sync", "/workspaces", "/settings", "/audit"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!protectedPath) return NextResponse.next();
  const hasSession = request.cookies.getAll().some((cookie) => cookie.name.includes("session_token"));
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/projects/:path*", "/tasks/:path*", "/calendar/:path*", "/schedule/:path*", "/integrations/:path*", "/sync/:path*", "/workspaces/:path*", "/settings/:path*", "/audit/:path*", "/home", "/projects", "/tasks", "/calendar", "/schedule", "/integrations", "/sync", "/workspaces", "/settings", "/audit"],
};
