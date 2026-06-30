import { NextResponse, type NextRequest } from "next/server";
import {
  invalidatePortalSession,
  requireAuthenticatedApiUser,
  requireValidCsrfToken,
} from "@/lib/auth";
import { buildRequestUrl, clearSessionCookie } from "@/lib/auth-session";
import { checkLoginRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateLimit = checkLoginRateLimit(`logout:${clientIp}`);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Demasiadas solicitudes. Intenta nuevamente más tarde." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const csrfToken = String(formData.get("csrfToken") || "").trim() || null;
  const csrfResponse = requireValidCsrfToken(request, csrfToken);

  if (csrfResponse) {
    return NextResponse.redirect(
      buildRequestUrl(request, "/login?error=csrf"),
      {
        status: 303,
      },
    );
  }

  const auth = await requireAuthenticatedApiUser(request);

  if (auth.user) {
    await invalidatePortalSession(auth.user);
  }

  const response = NextResponse.redirect(
    buildRequestUrl(request, "/login?logged_out=1"),
    { status: 303 },
  );
  clearSessionCookie(response);
  return response;
}
