import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { type NextRequest, NextResponse } from "next/server";

export type PortalSessionRoleKey =
  | "client"
  | "receiver"
  | "receiver_admin"
  | "admin"
  | "superuser";

export type PortalSessionStatus = "Activo" | "Pendiente" | "Bloqueado";

export type PortalSessionLocale = "es" | "en";

export type PortalSessionClaims = JWTPayload & {
  sub: string;
  username: string;
  fullName: string;
  email: string;
  roleKey: PortalSessionRoleKey;
  preferredLocale: PortalSessionLocale;
  recipientCode: string | null;
  recipientGroupCode: string | null;
  canViewAll: boolean;
  modules: string[];
  refreshTokenVersion: number;
  status: PortalSessionStatus;
};

export type PortalSessionTokenInput = {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  roleKey: PortalSessionRoleKey;
  preferredLocale: PortalSessionLocale;
  recipientCode: string | null;
  recipientGroupCode: string | null;
  canViewAll: boolean;
  modules: string[];
  refreshTokenVersion: number;
  status: PortalSessionStatus;
};

const AUTH_ALGORITHM = "HS256";
const DEFAULT_SESSION_TTL_MINUTES = 480;

export const SESSION_COOKIE_NAME = "PortalClientes.Session";
export const CSRF_COOKIE_NAME = "PortalClientes.Csrf";

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error(
      "Missing AUTH_JWT_SECRET. Define a value with at least 32 characters.",
    );
  }

  return new TextEncoder().encode(secret);
}

export function getSessionMaxAgeSeconds() {
  const ttlMinutes = Number(
    process.env.AUTH_SESSION_TTL_MINUTES || DEFAULT_SESSION_TTL_MINUTES,
  );
  const safeTtlMinutes =
    Number.isFinite(ttlMinutes) && ttlMinutes > 0
      ? Math.trunc(ttlMinutes)
      : DEFAULT_SESSION_TTL_MINUTES;

  return safeTtlMinutes * 60;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  };
}

export function getCsrfCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  };
}

export async function signPortalSessionToken(input: PortalSessionTokenInput) {
  return new SignJWT({
    username: input.username,
    fullName: input.fullName,
    email: input.email,
    roleKey: input.roleKey,
    preferredLocale: input.preferredLocale,
    recipientCode: input.recipientCode,
    recipientGroupCode: input.recipientGroupCode,
    canViewAll: input.canViewAll,
    modules: input.modules,
    refreshTokenVersion: input.refreshTokenVersion,
    status: input.status,
  })
    .setProtectedHeader({ alg: AUTH_ALGORITHM, typ: "JWT" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(
      `${Math.max(1, Math.floor(getSessionMaxAgeSeconds() / 60))}m`,
    )
    .sign(getJwtSecret());
}

export async function verifyPortalSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: [AUTH_ALGORITHM],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    return payload as PortalSessionClaims;
  } catch {
    return null;
  }
}

export function isPortalAdminRole(roleKey: string | null | undefined) {
  return roleKey === "admin" || roleKey === "superuser";
}

export function sanitizeNextPath(nextPath?: string | null) {
  const candidate = nextPath?.trim();

  if (!candidate || !candidate.startsWith("/")) {
    return "/";
  }

  if (candidate.startsWith("//") || candidate.includes("\\")) {
    return "/";
  }

  if (/[\u0000-\u001F\u007F]/.test(candidate)) {
    return "/";
  }

  try {
    const parsed = new URL(candidate, "https://portalclientes.local");
    const sanitizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (
      sanitizedPath.startsWith("/api") ||
      sanitizedPath.startsWith("/login")
    ) {
      return "/";
    }

    return sanitizedPath;
  } catch {
    return "/";
  }
}

export function normalizeOrigin(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

function readForwardedHeader(request: NextRequest, headerName: string) {
  const value = request.headers.get(headerName)?.split(",")[0]?.trim();
  return value ? value : null;
}

function shouldUseSecureCookies() {
  const secureMode = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();

  if (["1", "true", "always"].includes(secureMode ?? "")) {
    return true;
  }

  if (["0", "false", "never"].includes(secureMode ?? "")) {
    return false;
  }

  const configuredOrigin =
    normalizeOrigin(process.env.AUTH_PUBLIC_ORIGIN) ??
    normalizeOrigin(process.env.APP_PUBLIC_URL);

  if (configuredOrigin) {
    return configuredOrigin.startsWith("https://");
  }

  return false;
}

export function resolveRequestOrigin(request: NextRequest) {
  const configuredOrigin =
    normalizeOrigin(process.env.AUTH_PUBLIC_ORIGIN) ??
    normalizeOrigin(process.env.APP_PUBLIC_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    throw new Error(
      "AUTH_PUBLIC_ORIGIN or APP_PUBLIC_URL must be set in production to prevent host header injection.",
    );
  }

  const host =
    readForwardedHeader(request, "x-forwarded-host") ??
    readForwardedHeader(request, "host") ??
    request.nextUrl.host;
  const protocol =
    readForwardedHeader(request, "x-forwarded-proto") ??
    request.nextUrl.protocol.replace(/:$/, "") ??
    "http";

  return `${protocol}://${host}`;
}

export function buildRequestUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, `${resolveRequestOrigin(request)}/`);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
}

export function readSessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function readCsrfTokenFromRequest(request: NextRequest) {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
}

export function hasValidCsrfToken(
  request: NextRequest,
  submittedToken: string | null,
) {
  const cookieToken = readCsrfTokenFromRequest(request);
  return Boolean(
    cookieToken && submittedToken && cookieToken === submittedToken,
  );
}

export function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    return response;
  }

  const csrfToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
  return response;
}
