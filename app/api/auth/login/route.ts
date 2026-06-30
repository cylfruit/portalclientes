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
import {
  buildRequestUrl,
  sanitizeNextPath,
  setSessionCookie,
} from "@/lib/auth-session";
import {
  updatePortalClientUserRecord,
  verifyPortalUserPassword,
} from "@/lib/portal-users";
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
} from "@/lib/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToLogin(
  request: NextRequest,
  nextPath: string,
  error: string,
) {
  return NextResponse.redirect(
    buildRequestUrl(request, buildLoginPath(nextPath, error)),
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

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateLimit = checkLoginRateLimit(`login:${clientIp}`);

  if (!rateLimit.allowed) {
    return new NextResponse("Demasiados intentos. Intenta nuevamente en 15 minutos.", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
      },
    });
  }

  const user = await fetchPortalClientUserRecordByUsername(username);

  if (!user || !verifyPortalUserPassword(password, user.passwordHash)) {
    return redirectToLogin(request, nextPath, "invalid-credentials");
  }

  resetLoginRateLimit(`login:${clientIp}`);

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

  const response = NextResponse.redirect(buildRequestUrl(request, nextPath), {
    status: 303,
  });
  setSessionCookie(response, await createPortalSessionToken(updatedUser));
  return response;
}
