import { createHash, randomBytes } from "node:crypto";
import { upsertPasswordResetToken } from "@/lib/clickhouse";
import { type PortalPasswordResetTokenRecord } from "@/lib/portal-users";

export type PasswordResetLocale = "es" | "en";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetTokenRecord(
  userId: string,
  token: string,
  now = Date.now(),
): PortalPasswordResetTokenRecord {
  return {
    userId,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now + PASSWORD_RESET_TTL_MS).toISOString(),
    usedAt: null,
    createdAt: new Date(now).toISOString(),
    version: now,
  };
}

export function isPasswordResetTokenUsable(
  record: PortalPasswordResetTokenRecord | null,
  now = Date.now(),
) {
  if (!record || record.usedAt) {
    return false;
  }

  const expiresAt = Date.parse(record.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export async function savePasswordResetToken(
  record: PortalPasswordResetTokenRecord,
) {
  return upsertPasswordResetToken(record);
}

export function buildPasswordResetLink(origin: string, token: string) {
  const url = new URL("/restablecer-contrasena", `${origin.replace(/\/$/, "")}/`);
  url.hash = `token=${encodeURIComponent(token)}`;
  return url.toString();
}

export async function sendPasswordResetEmail(input: {
  email: string;
  fullName: string;
  resetLink: string;
  locale: PasswordResetLocale;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    throw new Error(
      "Missing RESEND_API_KEY or RESEND_FROM_EMAIL for password recovery.",
    );
  }

  const isEnglish = input.locale === "en";
  const safeName = escapeHtml(input.fullName);
  const safeLink = escapeHtml(input.resetLink);
  const subject = isEnglish
    ? "Reset your C&L Fruit portal password"
    : "Recupera tu contrasena del portal C&L Fruit";
  const greeting = isEnglish ? `Hello ${safeName},` : `Hola ${safeName},`;
  const message = isEnglish
    ? "Use the following button to set a new password for your client portal account. This link expires in one hour."
    : "Usa el siguiente boton para definir una nueva contrasena para tu cuenta del portal de clientes. Este enlace vence en una hora.";
  const buttonLabel = isEnglish ? "Reset password" : "Restablecer contrasena";
  const fallbackLabel = isEnglish
    ? "If the button does not work, open this link:"
    : "Si el boton no funciona, abre este enlace:";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      reply_to: process.env.RESEND_REPLY_TO?.trim() || undefined,
      subject,
      html: `<!doctype html><html lang="${isEnglish ? "en" : "es"}"><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333"><p>${greeting}</p><p>${message}</p><p><a href="${safeLink}" style="display:inline-block;background:#d8b25c;color:#111;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${buttonLabel}</a></p><p>${fallbackLabel}</p><p><a href="${safeLink}">${safeLink}</a></p><p>${isEnglish ? "If you did not request this email, you can ignore it." : "Si no solicitaste este correo, puedes ignorarlo."}</p></body></html>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Resend password recovery failed (${response.status}).`);
  }
}
