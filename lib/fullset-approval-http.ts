import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireValidCsrfToken } from "@/lib/auth";
import {
  FullSetApprovalApiError,
  type ApprovalImage,
} from "@/lib/fullset-approval-api";
import {
  MAX_DECISION_REQUEST_BYTES,
  MAX_IMAGES_PER_DOCUMENT,
  MAX_IMAGES_PER_REQUEST,
  MAX_IMAGE_BYTES,
  detectImageType,
  getClientIp,
} from "@/lib/fullset-approval-input";
import {
  checkApprovalDecisionRateLimit,
  checkApprovalViewRateLimit,
} from "@/lib/rate-limiter";

/**
 * Piezas comunes de las rutas públicas de aprobación del Full Set: lectura acotada
 * del body, CSRF, límite de intentos y traducción de errores del backend.
 *
 * Estas rutas NO tienen sesión (el cliente llega desde un correo): lo que las protege
 * es el token de 256 bits, el CSRF, el límite de intentos y que el backend revalida
 * todo (vigencia, pertenencia del documento, decisión única).
 */

const MAX_BODY_BYTES = 16 * 1024;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "Referrer-Policy": "no-referrer",
} as const;

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export function messageResponse(message: string, status: number, code?: string) {
  return jsonResponse(code ? { message, code } : { message }, status);
}

export async function readJsonBody(
  request: NextRequest,
): Promise<{ body: Record<string, unknown> } | { response: NextResponse }> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { response: messageResponse("La solicitud es demasiado grande.", 413) };
  }

  try {
    const text = await request.text();

    if (text.length > MAX_BODY_BYTES) {
      return {
        response: messageResponse("La solicitud es demasiado grande.", 413),
      };
    }

    const parsed: unknown = JSON.parse(text);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }

    return { body: parsed as Record<string, unknown> };
  } catch {
    return {
      response: messageResponse("La solicitud no tiene un formato valido.", 400),
    };
  }
}

const MAX_PAYLOAD_CHARS = 64 * 1024;
const IMAGE_FIELD = /^imagenes(_[1-9][0-9]{0,9})?$/;

function safeImageName(name: string) {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[^\w.\- ()]/g, "_")
    .slice(0, 120);
  return base || "imagen";
}

/**
 * Lee una respuesta del cliente: JSON (sin imágenes) o multipart (JSON en
 * "payload" + imágenes). Cada imagen se valida por su CONTENIDO antes de
 * reenviarla; el backend vuelve a validar todo.
 */
export async function readDecisionRequest(
  request: NextRequest,
): Promise<
  | { body: Record<string, unknown>; images: ApprovalImage[] }
  | { response: NextResponse }
> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.startsWith("multipart/form-data")) {
    const parsed = await readJsonBody(request);
    return "response" in parsed ? parsed : { body: parsed.body, images: [] };
  }

  // Sin tamaño declarado no se lee: formData() cargaría todo en memoria.
  const declaredLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
    return { response: messageResponse("Falta el tamaño de la solicitud.", 411) };
  }
  if (declaredLength > MAX_DECISION_REQUEST_BYTES) {
    return {
      response: messageResponse(
        "La solicitud es demasiado grande. Adjunta menos imágenes o más livianas.",
        413,
        "IMAGENES_INVALIDAS",
      ),
    };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { response: messageResponse("La solicitud no tiene un formato valido.", 400) };
  }

  const rawPayload = form.get("payload");
  let body: Record<string, unknown>;
  try {
    if (typeof rawPayload !== "string" || rawPayload.length > MAX_PAYLOAD_CHARS) {
      throw new Error("payload");
    }
    const parsed: unknown = JSON.parse(rawPayload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("payload");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return { response: messageResponse("La solicitud no tiene un formato valido.", 400) };
  }

  const images: ApprovalImage[] = [];
  const perField = new Map<string, number>();

  for (const [field, value] of form.entries()) {
    if (field === "payload") continue;

    if (typeof value === "string" || !IMAGE_FIELD.test(field)) {
      return { response: messageResponse("La solicitud no tiene un formato valido.", 400) };
    }

    const count = (perField.get(field) ?? 0) + 1;
    perField.set(field, count);
    if (count > MAX_IMAGES_PER_DOCUMENT || images.length >= MAX_IMAGES_PER_REQUEST) {
      return {
        response: messageResponse(
          `Puedes adjuntar hasta ${MAX_IMAGES_PER_DOCUMENT} imágenes por documento.`,
          400,
          "IMAGENES_INVALIDAS",
        ),
      };
    }

    if (value.size <= 0 || value.size > MAX_IMAGE_BYTES) {
      return {
        response: messageResponse(
          "Cada imagen puede pesar hasta 5 MB.",
          413,
          "IMAGENES_INVALIDAS",
        ),
      };
    }

    const bytes = new Uint8Array(await value.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) {
      return {
        response: messageResponse(
          "Solo se aceptan imágenes PNG, JPG o WebP.",
          415,
          "IMAGENES_INVALIDAS",
        ),
      };
    }

    images.push({ field, name: safeImageName(value.name), type, bytes });
  }

  return { body, images };
}

function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * CSRF + límite de intentos por IP y por token. Devuelve la respuesta de rechazo o
 * null si se puede continuar.
 */
export function guardPublicApprovalRequest(
  request: NextRequest,
  body: Record<string, unknown>,
  kind: "view" | "decision",
  scope: "all" | "ip" | "token" = "all",
) {
  // El CSRF llega en el body (JSON) o en la cabecera (multipart, que se valida
  // ANTES de leer un cuerpo que puede pesar varios MB).
  const submittedCsrf =
    typeof body.csrfToken === "string"
      ? body.csrfToken
      : request.headers.get("x-csrf-token");
  const csrfResponse = requireValidCsrfToken(request, submittedCsrf);

  if (csrfResponse) {
    return csrfResponse;
  }

  const check =
    kind === "decision"
      ? checkApprovalDecisionRateLimit
      : checkApprovalViewRateLimit;
  const clientIp = getClientIp(request.headers);
  const keys: string[] = [];

  // Sin IP conocida no se limita por IP: todos compartirían la misma clave y un
  // cliente podría bloquear a los demás.
  if (scope !== "token" && clientIp !== "unknown") {
    keys.push(`approval:${kind}:ip:${clientIp}`);
  }

  // Aunque lleguen desde muchas IPs, un mismo token no puede ser sondeado sin límite.
  if (scope !== "ip" && typeof body.token === "string" && body.token) {
    keys.push(`approval:${kind}:token:${shortHash(body.token)}`);
  }

  const limited = keys.map((key) => check(key)).find((result) => !result.allowed);

  if (limited) {
    const response = messageResponse(
      "Demasiados intentos. Espera unos minutos e intenta nuevamente.",
      429,
      "RATE_LIMIT",
    );
    response.headers.set(
      "Retry-After",
      String(Math.max(1, Math.ceil(limited.retryAfterMs / 1000))),
    );
    return response;
  }

  return null;
}

// Códigos de estado que el backend usa para errores de negocio que el cliente debe
// ver. Cualquier otro (401/403 de la cuenta de servicio, 5xx) se oculta.
const PASSTHROUGH_STATUSES = new Set([400, 404, 409, 410]);

export function mapApprovalError(error: unknown, label: string) {
  if (
    error instanceof FullSetApprovalApiError &&
    PASSTHROUGH_STATUSES.has(error.statusCode)
  ) {
    return jsonResponse(
      {
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.estado ? { estado: error.estado } : {}),
      },
      error.statusCode,
    );
  }

  // 401/403 = la cuenta de servicio perdió permisos; 5xx/timeout = backend caído.
  console.error(
    `Full Set approval API error (${label})`,
    error instanceof Error ? error.message : error,
  );

  return messageResponse(
    "No fue posible completar la solicitud. Intenta nuevamente en unos minutos.",
    503,
    "NO_DISPONIBLE",
  );
}
