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

async function findUserWithValidPassword(username: string, password: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const user = await fetchPortalClientUserRecordByUsername(username);

    if (user && verifyPortalUserPassword(password, user.passwordHash)) {
      return user;
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }

  return null;
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

  const rateLimitKeys = [
    `login:account:${username.toLowerCase()}`,
    ...(clientIp !== "unknown" ? [`login:ip:${clientIp}`] : []),
  ];
  const rateLimits = rateLimitKeys.map((key) => checkLoginRateLimit(key));
  const rateLimit =
    rateLimits.find((entry) => !entry.allowed) ?? rateLimits[0];

  if (!rateLimit.allowed) {
    return new NextResponse("Demasiados intentos. Intenta nuevamente en 15 minutos.", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
      },
    });
  }

  // ReplacingMergeTree replicas can briefly lag immediately after a password update.
  const user = await findUserWithValidPassword(username, password);

  if (!user) {
    return redirectToLogin(request, nextPath, "invalid-credentials");
  }

  rateLimitKeys.forEach((key) => resetLoginRateLimit(key));

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

  const destination = user.requiresPasswordReset
    ? "/seguridad?required=1"
    : nextPath;
  const response = NextResponse.redirect(buildRequestUrl(request, destination), {
    status: 303,
  });
  setSessionCookie(response, await createPortalSessionToken(updatedUser));
  return response;
}
