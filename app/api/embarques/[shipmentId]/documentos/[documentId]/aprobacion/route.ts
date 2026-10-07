import { NextResponse, type NextRequest } from "next/server";
import {
  filterRowsForPortalUser,
  requireAuthenticatedApiUser,
  requireValidCsrfToken,
} from "@/lib/auth";
import { fetchEmbarqueRows } from "@/lib/clickhouse";
import {
  FullSetApprovalApiError,
  decideFromPortal,
} from "@/lib/fullset-approval-api";
import {
  getClientIp,
  isCommentAcceptableFor,
  normalizeApproverName,
  normalizeApproverEmail,
  normalizeComment,
  parseDecision,
  truncateUserAgent,
} from "@/lib/fullset-approval-input";
import { readDecisionRequest } from "@/lib/fullset-approval-http";
import { checkApprovalDecisionRateLimit } from "@/lib/rate-limiter";
import {
  ShipmentDocumentsApiError,
  listShipmentDocuments,
} from "@/lib/shipment-documents-api";
import {
  resolveFullSetApproval,
  shouldExposeCustomerDocument,
} from "@/lib/shipment-documents-visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    shipmentId: string;
    documentId: string;
  }>;
};

async function userCanAccessShipment(
  shipmentId: string,
  season: string,
  user: NonNullable<
    Awaited<ReturnType<typeof requireAuthenticatedApiUser>>["user"]
  >,
) {
  const visibleRows = filterRowsForPortalUser(
    await fetchEmbarqueRows({ season }),
    user,
  );

  return visibleRows.some(
    (row) =>
      String(row.NroEmbarque ?? "").trim() === shipmentId &&
      String(row.CodigoTemporada ?? "").trim() === season,
  );
}

/**
 * El cliente con usuario en el portal aprueba o rechaza el Full Set de SU embarque
 * sin pasar por el link del correo. Misma regla que el link: la decisión es única y
 * el rechazo exige motivo; el backend la valida de nuevo.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthenticatedApiUser(request);

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { user } = auth;

  // Un usuario que ve todos los embarques es de C&L Fruit, no un cliente: la
  // respuesta del cliente solo la da quien tiene acceso acotado a su propio embarque.
  if (user.canViewAll) {
    return NextResponse.json(
      { message: "Tu usuario no puede responder en nombre de un cliente." },
      { status: 403 },
    );
  }

  const rateLimit = checkApprovalDecisionRateLimit(
    `approval:portal:user:${user.userId}`,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Demasiados intentos. Espera unos minutos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000)),
          ),
        },
      },
    );
  }

  const isMultipart = (request.headers.get("content-type") ?? "")
    .toLowerCase()
    .startsWith("multipart/form-data");

  // Con imágenes el CSRF viaja en la cabecera y se valida ANTES de leer el cuerpo.
  if (isMultipart) {
    const csrfHeaderResponse = requireValidCsrfToken(
      request,
      request.headers.get("x-csrf-token"),
    );

    if (csrfHeaderResponse) {
      return csrfHeaderResponse;
    }
  }

  const parsed = await readDecisionRequest(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const { body, images } = parsed;

  if (!isMultipart) {
    const csrfResponse = requireValidCsrfToken(
      request,
      typeof body.csrfToken === "string" ? body.csrfToken : null,
    );

    if (csrfResponse) {
      return csrfResponse;
    }
  }

  // En esta ruta las imágenes van todas en el campo "imagenes".
  if (images.some((image) => image.field !== "imagenes")) {
    return NextResponse.json(
      { message: "La solicitud no tiene un formato valido." },
      { status: 400 },
    );
  }

  const { shipmentId: rawShipmentId, documentId: rawDocumentId } =
    await context.params;
  const shipmentId = rawShipmentId.trim();
  const documentId = Number(rawDocumentId.trim());
  const season = typeof body.season === "string" ? body.season.trim() : "";
  const decision = parseDecision(body.decision);
  const comment = normalizeComment(body.comment);

  if (
    !/^\d{1,9}$/.test(shipmentId) ||
    !Number.isSafeInteger(documentId) ||
    documentId <= 0 ||
    !season ||
    season.length > 50 ||
    !decision
  ) {
    return NextResponse.json(
      { message: "La solicitud no es valida." },
      { status: 400 },
    );
  }

  if (!isCommentAcceptableFor(decision, comment)) {
    return NextResponse.json(
      { message: "Indica el motivo del rechazo." },
      { status: 400, headers: { "X-Error-Code": "MOTIVO_REQUERIDO" } },
    );
  }

  try {
    if (!(await userCanAccessShipment(shipmentId, season, user))) {
      return NextResponse.json(
        { message: "Embarque no encontrado para la temporada indicada." },
        { status: 404 },
      );
    }

    // El documento tiene que ser un Full Set visible de ESTE embarque y temporada, y
    // el último pendiente: así no se responde un documento ajeno ni uno reemplazado.
    const documents = await listShipmentDocuments({
      shipmentId,
      season,
      type: "FULL_SET",
    });
    const target = documents.data?.find(
      (document) =>
        Number(document.documento_id) === documentId &&
        shouldExposeCustomerDocument(document),
    );
    const approval = target ? resolveFullSetApproval(target) : null;

    if (!target || !approval) {
      return NextResponse.json(
        { message: "Documento no encontrado para el embarque indicado." },
        { status: 404 },
      );
    }

    if (approval.status !== "PENDIENTE" || !approval.canDecide) {
      return NextResponse.json(
        {
          message: "Este Full Set ya no se puede responder.",
          code: "YA_DECIDIDO",
          estado: approval.status,
        },
        { status: 409 },
      );
    }

    await decideFromPortal({
      shipmentId: Number(shipmentId),
      season,
      documentId,
      decision,
      comment: comment || undefined,
      images,
      approver: {
        nombre: normalizeApproverName(user.fullName) || user.username,
        email: normalizeApproverEmail(user.email),
        ref: user.userId,
      },
      context: {
        ip: getClientIp(request.headers),
        userAgent: truncateUserAgent(request.headers.get("user-agent")),
      },
    });

    return NextResponse.json({ success: true, decision });
  } catch (error) {
    if (
      error instanceof FullSetApprovalApiError &&
      [400, 404, 409, 410].includes(error.statusCode)
    ) {
      return NextResponse.json(
        {
          message: error.message,
          ...(error.code ? { code: error.code } : {}),
          ...(error.estado ? { estado: error.estado } : {}),
        },
        { status: error.statusCode },
      );
    }

    if (error instanceof ShipmentDocumentsApiError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Portal Full Set approval error", error);

    return NextResponse.json(
      { message: "No fue posible registrar tu respuesta." },
      { status: 500 },
    );
  }
}
