import { NextResponse, type NextRequest } from "next/server";
import {
  requireAuthenticatedApiUser,
  filterRowsForPortalUser,
} from "@/lib/auth";
import { fetchEmbarqueRows } from "@/lib/clickhouse";
import {
  listShipmentDocuments,
  ShipmentDocumentsApiError,
} from "@/lib/shipment-documents-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    shipmentId: string;
  }>;
};

function buildProxyDocumentUrl(input: {
  requestedShipmentId: string;
  documentShipmentId: string;
  documentId: string;
  season: string;
  disposition: "inline" | "attachment";
  upstreamUrl: string | null;
}) {
  const fallbackShipmentId =
    input.documentShipmentId.trim() || input.requestedShipmentId.trim();
  const fallbackUrl = `/api/embarques/${encodeURIComponent(fallbackShipmentId)}/documentos/${encodeURIComponent(input.documentId)}?temporada=${encodeURIComponent(input.season)}&disposition=${input.disposition}`;
  const normalizedUpstreamUrl = input.upstreamUrl?.trim();

  if (!normalizedUpstreamUrl) {
    return fallbackUrl;
  }

  try {
    const parsedUrl = new URL(
      normalizedUpstreamUrl,
      "http://documents-api.local",
    );
    const pathnameMatch = parsedUrl.pathname.match(
      /^\/api\/documentos\/embarque\/([^/]+)\/archivos\/([^/]+)$/,
    );

    if (!pathnameMatch) {
      return fallbackUrl;
    }

    const upstreamShipmentId = decodeURIComponent(pathnameMatch[1]).trim();
    const upstreamDocumentId = decodeURIComponent(pathnameMatch[2]).trim();
    const searchParams = new URLSearchParams(parsedUrl.search);

    searchParams.set("temporada", input.season);
    searchParams.set("disposition", input.disposition);

    return `/api/embarques/${encodeURIComponent(upstreamShipmentId || fallbackShipmentId)}/documentos/${encodeURIComponent(upstreamDocumentId || input.documentId)}?${searchParams.toString()}`;
  } catch {
    return fallbackUrl;
  }
}

function handleShipmentDocumentsApiError(error: unknown) {
  if (error instanceof ShipmentDocumentsApiError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  console.error("Shipment documents list API error", error);

  return NextResponse.json(
    {
      message: "No fue posible consultar los documentos del embarque.",
    },
    { status: 500 },
  );
}

async function userCanAccessShipment(
  shipmentId: string,
  season: string,
  user: Awaited<ReturnType<typeof requireAuthenticatedApiUser>>["user"],
) {
  if (!user) {
    return false;
  }

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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuthenticatedApiUser(request);

    if (auth.response) {
      return auth.response;
    }

    const { shipmentId } = await context.params;
    const season = request.nextUrl.searchParams.get("temporada")?.trim() || "";
    const type = request.nextUrl.searchParams.get("tipo")?.trim() || null;

    if (!season) {
      return NextResponse.json(
        { message: "La temporada es obligatoria." },
        { status: 400 },
      );
    }

    if (!(await userCanAccessShipment(shipmentId.trim(), season, auth.user))) {
      return NextResponse.json(
        { message: "Embarque no encontrado para la temporada indicada." },
        { status: 404 },
      );
    }

    const payload = await listShipmentDocuments({
      shipmentId,
      season,
      type,
    });

    const items = payload.data!.map((document) => {
      const documentId = String(document.documento_id);
      const documentShipmentId = String(document.embarque_id);

      return {
        id: documentId,
        shipmentId: documentShipmentId,
        season: document.temporada,
        type: document.tipo,
        status: document.estado,
        originalName: document.original_name,
        mimeType: document.mime_type,
        size: document.size,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        viewUrl: buildProxyDocumentUrl({
          requestedShipmentId: shipmentId,
          documentShipmentId,
          documentId,
          season,
          disposition: "inline",
          upstreamUrl: document.view_url,
        }),
        downloadUrl: buildProxyDocumentUrl({
          requestedShipmentId: shipmentId,
          documentShipmentId,
          documentId,
          season,
          disposition: "attachment",
          upstreamUrl: document.download_url,
        }),
      };
    });

    return NextResponse.json({
      success: true,
      shipmentId,
      season,
      type,
      summary: {
        totalDocuments: payload.resumen?.total_documentos ?? items.length,
        availableFiles: payload.resumen?.archivos_disponibles ?? items.length,
        unavailableFiles: payload.resumen?.archivos_no_disponibles ?? 0,
      },
      total: items.length,
      items,
    });
  } catch (error) {
    return handleShipmentDocumentsApiError(error);
  }
}
