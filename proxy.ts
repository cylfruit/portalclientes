import { NextResponse, type NextRequest } from "next/server";
import {
  buildRequestUrl,
  ensureCsrfCookie,
  isPortalAdminRole,
  readSessionTokenFromRequest,
  sanitizeNextPath,
  verifyPortalSessionToken,
} from "@/lib/auth-session";
import { SECURITY_HEADERS, getContentSecurityPolicy } from "@/lib/security-headers";

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

  function withSecurityHeaders(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    if (!response.headers.has("Content-Security-Policy")) {
      response.headers.set("Content-Security-Policy", getContentSecurityPolicy());
    }
    return response;
  }

  if (isStaticAsset(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const sessionToken = readSessionTokenFromRequest(request);
  const sessionClaims = sessionToken
    ? await verifyPortalSessionToken(sessionToken)
    : null;

  if (isPublicPath(pathname)) {
    return withSecurityHeaders(ensureCsrfCookie(request, NextResponse.next()));
  }

  if (!sessionClaims) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json({ message: "No autenticado." }, { status: 401 }),
      );
    }

    const loginUrl = buildRequestUrl(
      request,
      `/login?next=${encodeURIComponent(sanitizeNextPath(`${pathname}${search}`))}`,
    );

    return withSecurityHeaders(
      ensureCsrfCookie(request, NextResponse.redirect(loginUrl)),
    );
  }

  if (isAdminPath(pathname) && !isPortalAdminRole(sessionClaims.roleKey)) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json(
          { message: "No tienes permisos para esta ruta." },
          { status: 403 },
        ),
      );
    }

    return withSecurityHeaders(
      ensureCsrfCookie(
        request,
        NextResponse.redirect(buildRequestUrl(request, "/")),
      ),
    );
  }

  return withSecurityHeaders(ensureCsrfCookie(request, NextResponse.next()));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
