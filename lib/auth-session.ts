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
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  };
}

export function getCsrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
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
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  if (nextPath.startsWith("//") || nextPath.startsWith("/api")) {
    return "/";
  }

  if (nextPath.startsWith("/login")) {
    return "/";
  }

  return nextPath;
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
