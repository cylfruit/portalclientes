import { NextResponse, type NextRequest } from "next/server";
import {
  buildRequestUrl,
  ensureCsrfCookie,
  isPortalAdminRole,
  readSessionTokenFromRequest,
  sanitizeNextPath,
  verifyPortalSessionToken,
} from "@/lib/auth-session";
import {
  SECURITY_HEADERS,
  getContentSecurityPolicy,
} from "@/lib/security-headers";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/recuperar-contrasena" ||
    pathname === "/restablecer-contrasena" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/forgot-password" ||
    pathname === "/api/auth/reset-password"
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

function createCspNonce() {
  return btoa(crypto.randomUUID());
}

function isDevelopmentEnv() {
  return process.env.NODE_ENV !== "production";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const dev = isDevelopmentEnv();
  const cspNonce = dev ? undefined : createCspNonce();
  const contentSecurityPolicy = getContentSecurityPolicy(cspNonce);
  const requestHeaders = new Headers(request.headers);

  if (cspNonce) {
    requestHeaders.set("x-nonce", cspNonce);
  }
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  function withSecurityHeaders(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);

    if (
      response.status >= 300 &&
      response.status < 400 &&
      !response.headers.has("Content-Type")
    ) {
      response.headers.set("Content-Type", "text/plain; charset=utf-8");
    }

    return response;
  }

  function nextWithSecurityHeaders() {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  if (pathname !== "/" && pathname.endsWith("/")) {
    const normalizedUrl = new URL(request.url);
    normalizedUrl.pathname = pathname.replace(/\/+$/, "");

    return withSecurityHeaders(NextResponse.redirect(normalizedUrl, 308));
  }

  if (isStaticAsset(pathname)) {
    return nextWithSecurityHeaders();
  }

  const sessionToken = readSessionTokenFromRequest(request);
  const sessionClaims = sessionToken
    ? await verifyPortalSessionToken(sessionToken)
    : null;

  if (isPublicPath(pathname)) {
    return withSecurityHeaders(
      ensureCsrfCookie(request, nextWithSecurityHeaders()),
    );
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

  return withSecurityHeaders(
    ensureCsrfCookie(request, nextWithSecurityHeaders()),
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
