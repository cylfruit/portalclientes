import type { NextRequest } from "next/server";
import { consultApprovalLink } from "@/lib/fullset-approval-api";
import {
  guardPublicApprovalRequest,
  jsonResponse,
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

  if (!isValidApprovalToken(body.token)) {
    // Mismo resultado que un link inexistente: no se distingue "mal formado" de "no existe".
    return jsonResponse({ estado: "INVALIDO" });
  }

  try {
    return jsonResponse(await consultApprovalLink(body.token));
  } catch (error) {
    return mapApprovalError(error, "consultar");
  }
}

export function GET() {
  return messageResponse("Metodo no permitido.", 405);
}
