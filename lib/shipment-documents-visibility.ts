import type { DocumentsApiShipmentDocument } from "@/lib/shipment-documents-api";

const CUSTOMER_VISIBLE_DOCUMENT_TYPES = new Set([
  "PACKING_LIST",
  "FACTURA_COMERCIAL",
  "FULL_SET",
  "ISF",
]);

export const CUSTOMER_VISIBLE_UNAVAILABLE_DOCUMENT_TYPES = [
  "PACKING_LIST",
  "FACTURA_COMERCIAL",
  "FULL_SET",
  "ISF",
  "OTROS_DOCUMENTOS",
] as const;

const HIDDEN_DOCUMENT_STATUSES = new Set(["ELIMINADO", "DELETED"]);

export function normalizeDocumentType(type: string) {
  return type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isCustomerVisibleDocumentType(type: string) {
  const normalizedType = normalizeDocumentType(type);

  if (!normalizedType) {
    return false;
  }

  if (
    normalizedType === "FACTURA_TRIBUTARIA" ||
    (normalizedType.includes("FACTURA") &&
      normalizedType.includes("TRIBUTARI"))
  ) {
    return false;
  }

  return (
    CUSTOMER_VISIBLE_DOCUMENT_TYPES.has(normalizedType) ||
    normalizedType.includes("OTRO") ||
    normalizedType.includes("OTHER")
  );
}

type ApprovalFields = Pick<
  DocumentsApiShipmentDocument,
  "estado" | "tipo" | "estado_aprobacion_cliente" | "es_ultimo_full_set"
>;

/**
 * Un Full Set que el cliente rechazó no se le vuelve a mostrar: queda oculto hasta
 * que Comex suba uno nuevo (que llega pendiente de aprobación).
 */
export function isRejectedFullSet(
  document: Pick<
    DocumentsApiShipmentDocument,
    "tipo" | "estado_aprobacion_cliente"
  >,
) {
  return (
    normalizeDocumentType(document.tipo) === "FULL_SET" &&
    String(document.estado_aprobacion_cliente ?? "")
      .trim()
      .toUpperCase() === "RECHAZADO"
  );
}

export function shouldExposeCustomerDocument(
  document: Pick<DocumentsApiShipmentDocument, "estado" | "tipo"> &
    Partial<Pick<ApprovalFields, "estado_aprobacion_cliente">>,
) {
  return (
    !HIDDEN_DOCUMENT_STATUSES.has(document.estado.trim().toUpperCase()) &&
    isCustomerVisibleDocumentType(document.tipo) &&
    !isRejectedFullSet(document)
  );
}

export type FullSetApprovalStatus = "PENDIENTE" | "APROBADO" | "NO_REQUIERE";

export type FullSetApproval = {
  status: FullSetApprovalStatus;
  /** Solo el último Full Set pendiente se puede responder. */
  canDecide: boolean;
  decidedAt: string | null;
};

/**
 * Estado de aprobación que se muestra en el portal. null para cualquier documento
 * que no sea Full Set (no se aprueba).
 */
export function resolveFullSetApproval(
  document: Pick<
    DocumentsApiShipmentDocument,
    | "tipo"
    | "estado_aprobacion_cliente"
    | "es_ultimo_full_set"
    | "fecha_aprobacion_cliente"
  >,
): FullSetApproval | null {
  if (normalizeDocumentType(document.tipo) !== "FULL_SET") {
    return null;
  }

  const raw = String(document.estado_aprobacion_cliente ?? "")
    .trim()
    .toUpperCase();
  const decidedAt = document.fecha_aprobacion_cliente ?? null;

  if (raw === "APROBADO") {
    return { status: "APROBADO", canDecide: false, decidedAt };
  }

  if (raw === "NO_NECESITA_ENVIO") {
    return { status: "NO_REQUIERE", canDecide: false, decidedAt };
  }

  return {
    status: "PENDIENTE",
    canDecide: document.es_ultimo_full_set === true,
    decidedAt: null,
  };
}
