import { NextResponse, type NextRequest } from "next/server";
import { requireValidCsrfToken } from "@/lib/auth";
import {
  fetchPasswordResetTokenByHash,
  fetchPortalClientUserRecordById,
  upsertPasswordResetToken,
  upsertPortalClientUserRecord,
} from "@/lib/clickhouse";
import {
  hashPasswordResetToken,
  isPasswordResetTokenUsable,
} from "@/lib/password-reset";
import {
  updatePortalClientUserRecord,
  validatePortalPassword,
} from "@/lib/portal-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const newPassword =
    typeof payload.newPassword === "string" ? payload.newPassword : "";
  const confirmPassword =
    typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";

  if (!token || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { message: "El enlace o la nueva contrasena no son validos." },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { message: "Las nuevas contrasenas no coinciden." },
      { status: 400 },
    );
  }

  try {
    validatePortalPassword(newPassword, "La nueva contrasena");
    const tokenHash = hashPasswordResetToken(token);
    const tokenRecord = await fetchPasswordResetTokenByHash(tokenHash);

    if (!tokenRecord || !isPasswordResetTokenUsable(tokenRecord)) {
      return NextResponse.json(
        { message: "El enlace ha expirado o ya fue utilizado." },
        { status: 400 },
      );
    }

    const user = await fetchPortalClientUserRecordById(tokenRecord.userId);

    if (!user || user.status !== "Activo") {
      return NextResponse.json(
        { message: "No fue posible restablecer esta cuenta." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    await upsertPasswordResetToken({
      ...tokenRecord,
      usedAt: now,
      version: Math.max(Date.now(), tokenRecord.version + 1),
    });

    const updatedUser = updatePortalClientUserRecord(user, {
      password: newPassword,
      requiresPasswordReset: false,
      refreshTokenVersion: user.refreshTokenVersion + 1,
    });
    await upsertPortalClientUserRecord(updatedUser);

    return NextResponse.json({
      success: true,
      message: "Tu contrasena fue restablecida correctamente.",
    });
  } catch (error) {
    console.error("Failed to reset portal password", error);

    return NextResponse.json(
      { message: "No fue posible restablecer la contrasena." },
      { status: 500 },
    );
  }
}
