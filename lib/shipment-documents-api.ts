type DocumentsApiLoginResponse = {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
  } | null;
};

type DocumentsApiListResponse = {
  success?: boolean;
  message?: string;
  resumen?: {
    total_documentos?: number;
    archivos_disponibles?: number;
    archivos_no_disponibles?: number;
  } | null;
  courier?: DocumentsApiCourierInfo | null;
  data?: DocumentsApiShipmentDocument[];
} & Record<string, unknown>;

export type DocumentsApiCourierInfo = {
  disponible?: boolean;
  no_necesita_courier?: boolean;
  numero_tracking?: string | null;
  nombre_courier?: string | null;
  fecha_completado_courier?: string | null;
  estado?: string | null;
};

export type DocumentsApiShipmentDocument = {
  documento_id: number;
  embarque_id: number;
  temporada: string;
  tipo: string;
  estado: string;
  original_name: string | null;
  mime_type: string | null;
  size: number | null;
  created_at: string | null;
  updated_at: string | null;
  view_url: string | null;
  download_url: string | null;
  /** Solo FULL_SET: PENDIENTE | APROBADO | RECHAZADO | NO_NECESITA_ENVIO. */
  estado_aprobacion_cliente?: string | null;
  fecha_aprobacion_cliente?: string | null;
  /** Solo FULL_SET: false si Comex subió una versión más nueva. */
  es_ultimo_full_set?: boolean;
};

export class ShipmentDocumentsApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "ShipmentDocumentsApiError";
    this.statusCode = statusCode;
  }
}

type DocumentsApiTokenCache = {
  token: string;
  expiresAtMs: number;
};

const DEFAULT_TOKEN_TTL_MS = 20 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 30_000;

let tokenCache: DocumentsApiTokenCache | null = null;

function getDocumentsApiBaseUrl() {
  const baseUrl = process.env.DOCUMENTS_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new ShipmentDocumentsApiError("Missing DOCUMENTS_API_BASE_URL.", 500);
  }

  return baseUrl.replace(/\/+$/, "");
}

function getDocumentsApiCredentials() {
  const username = process.env.DOCUMENTS_API_USERNAME?.trim();
  const password = process.env.DOCUMENTS_API_PASSWORD ?? "";

  if (!username || !password) {
    throw new ShipmentDocumentsApiError(
      "Missing DOCUMENTS_API_USERNAME or DOCUMENTS_API_PASSWORD.",
      500,
    );
  }

  return { username, password };
}

function getDocumentsApiTimeoutMs() {
  const timeoutMs = Number(
    process.env.DOCUMENTS_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.trunc(timeoutMs);
}

function getDocumentsApiTokenTtlMs() {
  const ttlMs = Number(process.env.DOCUMENTS_API_TOKEN_TTL_MS);

  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    return DEFAULT_TOKEN_TTL_MS;
  }

  return Math.trunc(ttlMs);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = getDocumentsApiTimeoutMs(),
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ShipmentDocumentsApiError(
        "The shipment documents API timed out.",
        504,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestDocumentsApiToken() {
  const { username, password } = getDocumentsApiCredentials();
  const response = await fetchWithTimeout(
    `${getDocumentsApiBaseUrl()}/api/auth/login`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    },
  );

  let payload: DocumentsApiLoginResponse | null = null;

  try {
    payload = (await response.json()) as DocumentsApiLoginResponse;
  } catch {
    payload = null;
  }

  const token = payload?.data?.token?.trim();

  if (!response.ok || !payload?.success || !token) {
    throw new ShipmentDocumentsApiError(
      payload?.message?.trim() ||
        "Unable to authenticate against the shipment documents API.",
      response.status || 502,
    );
  }

  tokenCache = {
    token,
    expiresAtMs: Date.now() + getDocumentsApiTokenTtlMs(),
  };

  return token;
}

async function getDocumentsApiToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    tokenCache &&
    tokenCache.expiresAtMs > Date.now() + 30_000
  ) {
    return tokenCache.token;
  }

  return requestDocumentsApiToken();
}

export async function fetchDocumentsApi(
  path: string,
  init: RequestInit,
  forceRefresh = false,
) {
  const token = await getDocumentsApiToken(forceRefresh);
  const response = await fetchWithTimeout(
    `${getDocumentsApiBaseUrl()}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.status === 401 && !forceRefresh) {
    return fetchDocumentsApi(path, init, true);
  }

  return response;
}

function normalizeRequiredValue(
  value: string | null | undefined,
  name: string,
) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new ShipmentDocumentsApiError(`Missing ${name}.`, 400);
  }

  return normalized;
}

export async function listShipmentDocuments(input: {
  shipmentId: string;
  season: string;
  type?: string | null;
}) {
  const shipmentId = normalizeRequiredValue(input.shipmentId, "shipmentId");
  const season = normalizeRequiredValue(input.season, "temporada");
  const searchParams = new URLSearchParams({ temporada: season });

  if (input.type?.trim()) {
    searchParams.set("tipo", input.type.trim());
  }

  const response = await fetchDocumentsApi(
    `/api/documentos/embarque/${encodeURIComponent(shipmentId)}/archivos?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );

  let payload: DocumentsApiListResponse | null = null;

  try {
    payload = (await response.json()) as DocumentsApiListResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
    throw new ShipmentDocumentsApiError(
      payload?.message?.toString().trim() ||
        "Unable to load shipment documents.",
      response.status || 502,
    );
  }

  return payload;
}

export async function fetchShipmentDocumentFile(input: {
  shipmentId: string;
  documentId: string;
  season: string;
  disposition?: "inline" | "attachment";
}) {
  const shipmentId = normalizeRequiredValue(input.shipmentId, "shipmentId");
  const documentId = normalizeRequiredValue(input.documentId, "documentId");
  const season = normalizeRequiredValue(input.season, "temporada");
  const disposition = input.disposition === "inline" ? "inline" : "attachment";
  const searchParams = new URLSearchParams({
    temporada: season,
    disposition,
  });

  const response = await fetchDocumentsApi(
    `/api/documentos/embarque/${encodeURIComponent(shipmentId)}/archivos/${encodeURIComponent(documentId)}?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "*/*",
      },
    },
  );

  if (!response.ok) {
    let message = "Unable to download the shipment document.";

    try {
      const payload = (await response.json()) as {
        message?: string;
      };

      if (payload?.message?.trim()) {
        message = payload.message.trim();
      }
    } catch {
      // Ignore JSON parsing errors for binary or empty responses.
    }

    throw new ShipmentDocumentsApiError(message, response.status || 502);
  }

  return response;
}
