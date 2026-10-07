import { NextResponse, type NextRequest } from "next/server";
import { fetchApprovalLinkFile } from "@/lib/fullset-approval-api";
import {
  guardPublicApprovalRequest,
  mapApprovalError,
  messageResponse,
  readJsonBody,
} from "@/lib/fullset-approval-http";
import { isValidApprovalToken } from "@/lib/fullset-approval-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const { body } = parsed;
  const guard = guardPublicApprovalRequest(request, body, "view");

  if (guard) {
    return guard;
  }

  const documentId = Number(body.documentId);

  if (
    !isValidApprovalToken(body.token) ||
    !Number.isSafeInteger(documentId) ||
    documentId <= 0
  ) {
    return messageResponse("Documento no encontrado.", 404, "NO_ENCONTRADO");
  }

  try {
    const upstream = await fetchApprovalLinkFile(body.token, documentId);
    const headers = new Headers();

    // El backend ya fuerza application/pdf (o descarga si el archivo no es un PDF
    // real); acá solo se copian las cabeceras que importan y se refuerzan las de
    // seguridad.
    for (const name of [
      "content-type",
      "content-length",
      "content-disposition",
    ]) {
      const value = upstream.headers.get(name);

      if (value) {
        headers.set(name, value);
      }
    }

    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
    headers.set("Referrer-Policy", "no-referrer");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    return mapApprovalError(error, "archivo");
  }
}

export function GET() {
  return messageResponse("Metodo no permitido.", 405);
}
