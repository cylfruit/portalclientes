import { NextResponse, type NextRequest } from "next/server";
import {
  fetchPortalClientUserRecordByUsername,
  upsertPortalClientUserRecord,
} from "@/lib/clickhouse";
import {
  buildLoginPath,
  createPortalSessionToken,
  requireValidCsrfToken,
} from "@/lib/auth";
import { sanitizeNextPath, setSessionCookie } from "@/lib/auth-session";
import {
  updatePortalClientUserRecord,
  verifyPortalUserPassword,
} from "@/lib/portal-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToLogin(
  request: NextRequest,
  nextPath: string,
  error: string,
) {
  return NextResponse.redirect(
    new URL(buildLoginPath(nextPath, error), request.url),
    { status: 303 },
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const csrfToken = String(formData.get("csrfToken") || "").trim() || null;
  const nextPath = sanitizeNextPath(String(formData.get("next") || "/"));

  const csrfResponse = requireValidCsrfToken(request, csrfToken);

  if (csrfResponse) {
    return redirectToLogin(request, nextPath, "csrf");
  }

  if (!username || !password) {
    return redirectToLogin(request, nextPath, "invalid-credentials");
  }

  const user = await fetchPortalClientUserRecordByUsername(username);

  if (!user || !verifyPortalUserPassword(password, user.passwordHash)) {
    return redirectToLogin(request, nextPath, "invalid-credentials");
  }

  if (user.status === "Pendiente") {
    return redirectToLogin(request, nextPath, "pending");
  }

  if (user.status === "Bloqueado") {
    return redirectToLogin(request, nextPath, "blocked");
  }

  const updatedUser = updatePortalClientUserRecord(user, {
    lastAccessAt: new Date().toISOString(),
  });

  await upsertPortalClientUserRecord(updatedUser);

  const response = NextResponse.redirect(new URL(nextPath, request.url), {
    status: 303,
  });
  setSessionCookie(response, await createPortalSessionToken(updatedUser));
  return response;
}
