import { NextResponse, type NextRequest } from "next/server";
import {
  createPortalSessionToken,
  requireAuthenticatedApiUser,
  requireValidCsrfToken,
} from "@/lib/auth";
import { setSessionCookie } from "@/lib/auth-session";
import { upsertPortalClientUserRecord } from "@/lib/clickhouse";
import {
  updatePortalClientUserRecord,
  validatePortalPassword,
  verifyPortalUserPassword,
} from "@/lib/portal-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApiUser(request);

  if (auth.response || !auth.user) {
    return (
      auth.response ??
      NextResponse.json({ message: "No autenticado." }, { status: 401 })
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { message: "La solicitud no tiene un formato valido." },
      { status: 400 },
    );
  }

  const csrfResponse = requireValidCsrfToken(
    request,
    typeof payload.csrfToken === "string" ? payload.csrfToken : null,
  );

  if (csrfResponse) {
    return csrfResponse;
  }

  const currentPassword =
    typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword =
    typeof payload.newPassword === "string" ? payload.newPassword : "";
  const confirmPassword =
    typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { message: "Completa todos los campos de contrasena." },
      { status: 400 },
    );
  }

  if (!verifyPortalUserPassword(currentPassword, auth.user.passwordHash)) {
    return NextResponse.json(
      { message: "La contrasena actual no es correcta." },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { message: "Las nuevas contrasenas no coinciden." },
      { status: 400 },
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { message: "La nueva contrasena debe ser diferente." },
      { status: 400 },
    );
  }

  try {
    validatePortalPassword(newPassword, "La nueva contrasena");
    const updatedUser = updatePortalClientUserRecord(auth.user, {
      password: newPassword,
      requiresPasswordReset: false,
      refreshTokenVersion: auth.user.refreshTokenVersion + 1,
    });

    await upsertPortalClientUserRecord(updatedUser);

    const response = NextResponse.json({
      success: true,
      message: "Tu contrasena fue actualizada correctamente.",
    });
    setSessionCookie(response, await createPortalSessionToken(updatedUser));
    return response;
  } catch (error) {
    console.error("Failed to change portal password", error);

    return NextResponse.json(
      { message: "No fue posible actualizar la contrasena." },
      { status: 500 },
    );
  }
}
