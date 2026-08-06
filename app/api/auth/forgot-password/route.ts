import { NextResponse, type NextRequest } from "next/server";
import {
  fetchPortalClientUserRecordByEmail,
  upsertPasswordResetToken,
} from "@/lib/clickhouse";
import {
  buildRequestUrl,
  resolveRequestOrigin,
} from "@/lib/auth-session";
import { requireValidCsrfToken } from "@/lib/auth";
import {
  buildPasswordResetLink,
  createPasswordResetToken,
  createPasswordResetTokenRecord,
  sendPasswordResetEmail,
} from "@/lib/password-reset";
import { checkPasswordRecoveryRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToRecovery(request: NextRequest, query: string) {
  return NextResponse.redirect(
    buildRequestUrl(request, `/recuperar-contrasena?${query}`),
    { status: 303 },
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const csrfResponse = requireValidCsrfToken(
    request,
    String(formData.get("csrfToken") || "").trim() || null,
  );

  if (csrfResponse) {
    return redirectToRecovery(request, "error=csrf");
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitKeys = [
    `recovery:email:${email || "empty"}`,
    ...(clientIp !== "unknown" ? [`recovery:ip:${clientIp}`] : []),
  ];
  const rateLimits = rateLimitKeys.map((key) =>
    checkPasswordRecoveryRateLimit(key),
  );

  if (rateLimits.some((limit) => !limit.allowed)) {
    return redirectToRecovery(request, "error=rate-limit");
  }

  if (email) {
    try {
      const user = await fetchPortalClientUserRecordByEmail(email);

      if (user?.status === "Activo") {
        const token = createPasswordResetToken();
        const tokenRecord = createPasswordResetTokenRecord(user.userId, token);
        const resetLink = buildPasswordResetLink(
          resolveRequestOrigin(request),
          token,
        );

        await upsertPasswordResetToken(tokenRecord);
        await sendPasswordResetEmail({
          email: user.email,
          fullName: user.fullName,
          resetLink,
          locale: user.preferredLocale,
        });
      }
    } catch (error) {
      console.error("Failed to process portal password recovery", error);
    }
  }

  return redirectToRecovery(request, "sent=1");
}
