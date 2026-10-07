import {
  fetchDocumentsApi,
  ShipmentDocumentsApiError,
} from "@/lib/shipment-documents-api";
import type { ApprovalDecision } from "@/lib/fullset-approval-input";

/**
 * Cliente del backend de Comex para la aprobación del Full Set.
 *
 * Solo corre en el servidor del portal y reutiliza la cuenta de servicio de
 * `shipment-documents-api`. El token del link viaja siempre en el BODY: nunca en la
 * URL ni en una query, para que no quede en logs de acceso del backend.
 */

export type ApprovalLinkState = "VIGENTE" | "VENCIDO" | "REVOCADO" | "INVALIDO";

export type ApprovalItemState =
  | "PENDIENTE"
  | "APROBADO"
  | "RECHAZADO"
  | "NO_REQUIERE"
  | "SUPERSEDIDO"
  | "NO_DISPONIBLE";

export type ApprovalLinkItem = {
  documentoId: number;
  embarqueId: number;
  temporada: string | null;
  codigo: string;
  archivo: string | null;
  estado: ApprovalItemState;
  observaciones: string | null;
  decididoEn: string | null;
};

export type ApprovalLinkData = {
  estado: ApprovalLinkState;
  expiraEn?: string | null;
  esPrueba?: boolean;
  idioma?: string | null;
  items?: ApprovalLinkItem[];
};

export type ApprovalDecisionResult = {
  documentoId: number;
  ok: boolean;
  estado?: string | null;
  codigo?: string;
  mensaje?: string;
};

export class FullSetApprovalApiError extends Error {
  statusCode: number;
  code: string | null;
  estado: string | null;

  constructor(
    message: string,
    statusCode = 500,
    code: string | null = null,
    estado: string | null = null,
  ) {
    super(message);
    this.name = "FullSetApprovalApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.estado = estado;
  }
}

type BackendEnvelope<T> = {
  success?: boolean;
  message?: string;
  code?: string;
  estado?: string;
  data?: T;
};

const BASE = "/api/fullset-approval";

/** Imagen ya validada por contenido, lista para reenviar al backend. */
export type ApprovalImage = {
  field: string;
  name: string;
  type: string;
  bytes: Uint8Array;
};

/**
 * Sin imágenes la decisión viaja como JSON (como siempre). Con imágenes viaja como
 * multipart: el JSON en el campo "payload" y cada imagen en su campo.
 */
function buildBody(body: unknown, images: ApprovalImage[]): RequestInit {
  if (images.length === 0) {
    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
  }

  const form = new FormData();
  form.append("payload", JSON.stringify(body));

  for (const image of images) {
    form.append(
      image.field,
      new Blob([image.bytes as BlobPart], { type: image.type }),
      image.name,
    );
  }

  // Sin Content-Type: fetch arma el boundary del multipart.
  return { body: form };
}

async function postJson<T>(
  path: string,
  body: unknown,
  images: ApprovalImage[] = [],
) {
  let response: Response;

  try {
    response = await fetchDocumentsApi(`${BASE}${path}`, {
      method: "POST",
      ...buildBody(body, images),
    });
  } catch (error) {
    if (error instanceof ShipmentDocumentsApiError) {
      throw new FullSetApprovalApiError(error.message, error.statusCode);
    }

    throw error;
  }

  let payload: BackendEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as BackendEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new FullSetApprovalApiError(
      payload?.message?.trim() || "No fue posible completar la solicitud.",
      response.status || 502,
      payload?.code ?? null,
      payload?.estado ?? null,
    );
  }

  return payload.data as T;
}

export function consultApprovalLink(token: string) {
  return postJson<ApprovalLinkData>("/portal/enlace/consultar", { token });
}

/** Devuelve la respuesta cruda para poder transmitir el PDF sin cargarlo en memoria. */
export async function fetchApprovalLinkFile(token: string, documentId: number) {
  let response: Response;

  try {
    response = await fetchDocumentsApi(`${BASE}/portal/enlace/archivo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "*/*" },
      body: JSON.stringify({ token, documentoId: documentId }),
    });
  } catch (error) {
    if (error instanceof ShipmentDocumentsApiError) {
      throw new FullSetApprovalApiError(error.message, error.statusCode);
    }

    throw error;
  }

  if (!response.ok) {
    let payload: BackendEnvelope<unknown> | null = null;

    try {
      payload = (await response.json()) as BackendEnvelope<unknown>;
    } catch {
      payload = null;
    }

    throw new FullSetApprovalApiError(
      payload?.message?.trim() || "Archivo no disponible.",
      response.status || 502,
      payload?.code ?? null,
    );
  }

  return response;
}

type ApproverPayload = {
  nombre: string;
  email: string | null;
  ref?: string | null;
};

type ClientContext = { ip: string; userAgent: string };

export function decideByApprovalLink(input: {
  token: string;
  decisions: {
    documentoId: number;
    decision: ApprovalDecision;
    observaciones?: string;
  }[];
  approver: ApproverPayload;
  context: ClientContext;
  /** Campo "imagenes_<documentoId>" por cada imagen. */
  images?: ApprovalImage[];
}) {
  return postJson<{ resultados: ApprovalDecisionResult[] }>(
    "/portal/enlace/decision",
    {
      token: input.token,
      decisiones: input.decisions,
      aprobador: input.approver,
      contexto: input.context,
    },
    input.images ?? [],
  );
}

export function decideFromPortal(input: {
  shipmentId: number;
  season: string;
  documentId: number;
  decision: ApprovalDecision;
  comment?: string;
  approver: ApproverPayload;
  context: ClientContext;
  /** Campo "imagenes" por cada imagen. */
  images?: ApprovalImage[];
}) {
  return postJson<{ decision: ApprovalDecision }>(
    `/portal/embarques/${encodeURIComponent(String(input.shipmentId))}/decision`,
    {
      temporada: input.season,
      documentoId: input.documentId,
      decision: input.decision,
      observaciones: input.comment,
      aprobador: input.approver,
      contexto: input.context,
    },
    input.images ?? [],
  );
}
