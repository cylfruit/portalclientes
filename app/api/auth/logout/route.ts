import { NextResponse, type NextRequest } from "next/server";
import {
  invalidatePortalSession,
  requireAuthenticatedApiUser,
  requireValidCsrfToken,
} from "@/lib/auth";
import { clearSessionCookie } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const csrfToken = String(formData.get("csrfToken") || "").trim() || null;
  const csrfResponse = requireValidCsrfToken(request, csrfToken);

  if (csrfResponse) {
    return NextResponse.redirect(new URL("/login?error=csrf", request.url), {
      status: 303,
    });
  }

  const auth = await requireAuthenticatedApiUser(request);

  if (auth.user) {
    await invalidatePortalSession(auth.user);
  }

  const response = NextResponse.redirect(
    new URL("/login?logged_out=1", request.url),
    { status: 303 },
  );
  clearSessionCookie(response);
  return response;
}
