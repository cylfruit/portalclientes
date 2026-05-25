import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import {
  fetchPortalClientUserRecordById,
  upsertPortalClientUserRecord,
} from "@/lib/clickhouse";
import { type EmbarqueRow } from "@/lib/portal-data";
import {
  clearSessionCookie,
  CSRF_COOKIE_NAME,
  hasValidCsrfToken,
  isPortalAdminRole,
  readSessionTokenFromRequest,
  sanitizeNextPath,
  SESSION_COOKIE_NAME,
  signPortalSessionToken,
  type PortalSessionClaims,
  verifyPortalSessionToken,
} from "@/lib/auth-session";
import {
  type PortalClientUserRecord,
  updatePortalClientUserRecord,
} from "@/lib/portal-users";

function buildLoginPath(nextPath: string, error?: string) {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  const sanitizedNextPath = sanitizeNextPath(nextPath);

  if (sanitizedNextPath !== "/") {
    searchParams.set("next", sanitizedNextPath);
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `/login?${queryString}` : "/login";
}

export async function createPortalSessionToken(user: PortalClientUserRecord) {
  return signPortalSessionToken({
    userId: user.userId,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    roleKey: user.roleKey,
    preferredLocale: user.preferredLocale,
    recipientCode: user.recipientCode,
    recipientGroupCode: user.recipientGroupCode,
    canViewAll: user.canViewAll,
    modules: user.modules,
    refreshTokenVersion: user.refreshTokenVersion,
    status: user.status,
  });
}

export async function readSessionClaimsFromCookies() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return verifyPortalSessionToken(sessionToken);
}

export async function readCsrfTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null;
}

export async function resolveAuthenticatedPortalUser(
  sessionClaims: PortalSessionClaims | null,
) {
  if (!sessionClaims?.sub) {
    return null;
  }

  const user = await fetchPortalClientUserRecordById(sessionClaims.sub);

  if (!user) {
    return null;
  }

  if (user.status !== "Activo") {
    return null;
  }

  if (user.refreshTokenVersion !== sessionClaims.refreshTokenVersion) {
    return null;
  }

  return user;
}

export async function getCurrentAuthenticatedPortalUser() {
  const sessionClaims = await readSessionClaimsFromCookies();
  return resolveAuthenticatedPortalUser(sessionClaims);
}

export async function requireAuthenticatedPortalUser(nextPath: string) {
  const user = await getCurrentAuthenticatedPortalUser();

  if (!user) {
    redirect(buildLoginPath(nextPath, "session-expired"));
  }

  return user;
}

export async function requireAdminPortalUser(nextPath: string) {
  const user = await requireAuthenticatedPortalUser(nextPath);

  if (!isPortalAdminRole(user.roleKey)) {
    redirect(buildLoginPath("/", "admin-required"));
  }

  return user;
}

export async function requireAuthenticatedApiUser(request: NextRequest) {
  const sessionToken = readSessionTokenFromRequest(request);

  if (!sessionToken) {
    return {
      response: NextResponse.json(
        { message: "No autenticado." },
        { status: 401 },
      ),
      user: null,
    };
  }

  const sessionClaims = await verifyPortalSessionToken(sessionToken);
  const user = await resolveAuthenticatedPortalUser(sessionClaims);

  if (!user) {
    const response = NextResponse.json(
      { message: "Sesion expirada o invalida." },
      { status: 401 },
    );

    clearSessionCookie(response);

    return {
      response,
      user: null,
    };
  }

  return {
    response: null,
    user,
  };
}

export async function requireAdminApiUser(request: NextRequest) {
  const auth = await requireAuthenticatedApiUser(request);

  if (auth.response || !auth.user) {
    return auth;
  }

  if (!isPortalAdminRole(auth.user.roleKey)) {
    return {
      response: NextResponse.json(
        { message: "No tienes permisos para esta ruta." },
        { status: 403 },
      ),
      user: null,
    };
  }

  return auth;
}

export function requireValidCsrfToken(
  request: NextRequest,
  submittedToken: string | null,
) {
  if (hasValidCsrfToken(request, submittedToken)) {
    return null;
  }

  return NextResponse.json(
    { message: "CSRF token invalido o ausente." },
    { status: 403 },
  );
}

export function filterRowsForPortalUser(
  rows: EmbarqueRow[],
  user: PortalClientUserRecord,
) {
  if (user.canViewAll) {
    return rows;
  }

  if (user.roleKey === "client") {
    return rows.filter(
      (row) =>
        user.recipientCode !== null && row.CodRecibidor === user.recipientCode,
    );
  }

  return rows.filter((row) => {
    if (user.recipientCode && row.CodRecibidor === user.recipientCode) {
      return true;
    }

    if (
      user.recipientGroupCode &&
      row.CodigoGrupoRecibidor === user.recipientGroupCode
    ) {
      return true;
    }

    return false;
  });
}

export async function invalidatePortalSession(user: PortalClientUserRecord) {
  const updatedUser = updatePortalClientUserRecord(user, {
    refreshTokenVersion: user.refreshTokenVersion + 1,
  });

  await upsertPortalClientUserRecord(updatedUser);
  return updatedUser;
}

export { buildLoginPath };
