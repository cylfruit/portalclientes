import { NextResponse, type NextRequest } from "next/server";
import {
  ensureCsrfCookie,
  isPortalAdminRole,
  readSessionTokenFromRequest,
  sanitizeNextPath,
  verifyPortalSessionToken,
} from "@/lib/auth-session";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout"
  );
}

function isAdminPath(pathname: string) {
  return pathname === "/usuarios" || pathname.startsWith("/api/portal-users");
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.[A-Za-z0-9]+$/.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = readSessionTokenFromRequest(request);
  const sessionClaims = sessionToken
    ? await verifyPortalSessionToken(sessionToken)
    : null;

  if (isPublicPath(pathname)) {
    return ensureCsrfCookie(request, NextResponse.next());
  }

  if (!sessionClaims) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const loginUrl = new URL(
      `/login?next=${encodeURIComponent(sanitizeNextPath(`${pathname}${search}`))}`,
      request.url,
    );

    return ensureCsrfCookie(request, NextResponse.redirect(loginUrl));
  }

  if (isAdminPath(pathname) && !isPortalAdminRole(sessionClaims.roleKey)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { message: "No tienes permisos para esta ruta." },
        { status: 403 },
      );
    }

    return ensureCsrfCookie(
      request,
      NextResponse.redirect(new URL("/", request.url)),
    );
  }

  return ensureCsrfCookie(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
