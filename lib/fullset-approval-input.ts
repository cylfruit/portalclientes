/**
 * Entradas de la aprobación pública del Full Set.
 *
 * Todo lo que llega del navegador de un cliente sin sesión se normaliza acá antes de
 * tocar el backend. Módulo sin dependencias del proyecto (importa solo tipos) para
 * poder probarlo con `node --test`.
 */

export const APPROVAL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const MAX_APPROVER_NAME_LENGTH = 120;
export const MAX_APPROVER_EMAIL_LENGTH = 255;
export const MAX_COMMENT_LENGTH = 1000;
/** Mismo mínimo que exige el backend para rechazar por link o portal. */
export const MIN_REJECTION_COMMENT_LENGTH = 5;
export const MAX_DECISIONS_PER_REQUEST = 50;

export type ApprovalDecision = "APROBADO" | "RECHAZADO";

export function isValidApprovalToken(value: unknown): value is string {
  return typeof value === "string" && APPROVAL_TOKEN_PATTERN.test(value);
}

/**
 * Lee el token del fragmento (`#token=...`). Va en el fragmento para que el
 * navegador nunca lo envíe al servidor, a los logs ni en el Referer.
 */
export function parseApprovalTokenFromHash(hash: string): string | null {
  const fragment = hash.replace(/^#/, "");
  const token = new URLSearchParams(fragment).get("token")?.trim() ?? "";

  return isValidApprovalToken(token) ? token : null;
}

// Caracteres de control (salvo salto de línea y tabulación) y marcas de dirección
// de texto, que sirven para disfrazar nombres y comentarios.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;

function stripControlChars(value: string) {
  return value.replace(CONTROL_CHARS, "");
}

export function normalizeApproverName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlChars(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_APPROVER_NAME_LENGTH);
}

const EMAIL_PATTERN = /^[^\s@<>"'`,;]+@[^\s@<>"'`,;]+\.[^\s@<>"'`,;]{2,}$/;

/** Correo opcional: vacío o inválido → null (no se rechaza la decisión por esto). */
export function normalizeApproverEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = stripControlChars(value).trim().toLowerCase();

  if (!email || email.length > MAX_APPROVER_EMAIL_LENGTH) {
    return null;
  }

  return EMAIL_PATTERN.test(email) ? email : null;
}

export function normalizeComment(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlChars(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_COMMENT_LENGTH);
}

export function parseDecision(value: unknown): ApprovalDecision | null {
  return value === "APROBADO" || value === "RECHAZADO" ? value : null;
}

/** Un rechazo exige un motivo real; aprobar no pide comentario. */
export function isCommentAcceptableFor(
  decision: ApprovalDecision,
  comment: string,
) {
  return decision === "APROBADO"
    ? true
    : comment.trim().length >= MIN_REJECTION_COMMENT_LENGTH;
}

export function getClientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || headers.get("x-real-ip")?.trim() || "";

  // Solo caracteres de una dirección IP: el valor termina en la bitácora.
  return /^[0-9a-fA-F:.]{3,45}$/.test(candidate) ? candidate : "unknown";
}

export function truncateUserAgent(value: string | null | undefined): string {
  return stripControlChars(value ?? "").slice(0, 300);
}

/** El comentario ya normalizado, sin importar si es aprobación o rechazo. */
export function buildApprover(input: { name: unknown; email: unknown }) {
  return {
    nombre: normalizeApproverName(input.name),
    email: normalizeApproverEmail(input.email),
  };
}
