import { type DocumentsApiShipmentDocument } from "@/lib/shipment-documents-api";

const CUSTOMER_VISIBLE_DOCUMENT_TYPES = new Set([
  "PACKING_LIST",
  "FACTURA_COMERCIAL",
  "FACTURA_PROFORMA",
  "FULL_SET",
  "ISF",
]);

export const CUSTOMER_VISIBLE_UNAVAILABLE_DOCUMENT_TYPES = [
  "PACKING_LIST",
  "FACTURA_COMERCIAL",
  "FACTURA_PROFORMA",
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

export function shouldExposeCustomerDocument(
  document: Pick<DocumentsApiShipmentDocument, "estado" | "tipo">,
) {
  return (
    !HIDDEN_DOCUMENT_STATUSES.has(document.estado.trim().toUpperCase()) &&
    isCustomerVisibleDocumentType(document.tipo)
  );
}
