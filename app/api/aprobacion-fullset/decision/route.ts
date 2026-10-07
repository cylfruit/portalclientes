import type { NextRequest } from "next/server";
import {
  decideByApprovalLink,
  type ApprovalDecisionResult,
} from "@/lib/fullset-approval-api";
import {
  guardPublicApprovalRequest,
  jsonResponse,
  mapApprovalError,
  messageResponse,
  readJsonBody,
} from "@/lib/fullset-approval-http";
import {
  MAX_DECISIONS_PER_REQUEST,
  buildApprover,
  getClientIp,
  isCommentAcceptableFor,
  isValidApprovalToken,
  normalizeComment,
  parseDecision,
  truncateUserAgent,
  type ApprovalDecision,
} from "@/lib/fullset-approval-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NormalizedDecision = {
  documentoId: number;
  decision: ApprovalDecision;
  observaciones?: string;
};

function normalizeDecisions(value: unknown): NormalizedDecision[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_DECISIONS_PER_REQUEST
  ) {
    return null;
  }

  const seen = new Set<number>();
  const result: NormalizedDecision[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const item = raw as Record<string, unknown>;
    const documentoId = Number(item.documentoId);
    const decision = parseDecision(item.decision);
    const comment = normalizeComment(item.observaciones);

    if (
      !Number.isSafeInteger(documentoId) ||
      documentoId <= 0 ||
      !decision ||
      !isCommentAcceptableFor(decision, comment)
    ) {
      return null;
    }

    // Un documento no puede decidirse dos veces dentro de la misma solicitud.
    if (seen.has(documentoId)) {
      return null;
    }

    seen.add(documentoId);
    result.push({
      documentoId,
      decision,
      ...(decision === "RECHAZADO" ? { observaciones: comment } : {}),
    });
  }

  return result;
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const { body } = parsed;
  const guard = guardPublicApprovalRequest(request, body, "decision");

  if (guard) {
    return guard;
  }

  if (!isValidApprovalToken(body.token)) {
    return messageResponse("Enlace no valido.", 404, "LINK_INVALIDO");
  }

  const approver = buildApprover({
    name: body.approverName,
    email: body.approverEmail,
  });

  if (!approver.nombre) {
    return messageResponse(
      "Indica tu nombre para registrar la respuesta.",
      400,
      "NOMBRE_REQUERIDO",
    );
  }

  const decisions = normalizeDecisions(body.decisions);

  if (!decisions) {
    return messageResponse(
      "La respuesta no es valida. Si rechazas un documento debes indicar el motivo.",
      400,
      "SOLICITUD_INVALIDA",
    );
  }

  try {
    const data = await decideByApprovalLink({
      token: body.token,
      decisions,
      approver,
      context: {
        ip: getClientIp(request.headers),
        userAgent: truncateUserAgent(request.headers.get("user-agent")),
      },
    });

    const results: ApprovalDecisionResult[] = data.resultados ?? [];

    return jsonResponse({ results });
  } catch (error) {
    return mapApprovalError(error, "decision");
  }
}

export function GET() {
  return messageResponse("Metodo no permitido.", 405);
}
