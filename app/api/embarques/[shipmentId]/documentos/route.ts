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
import {
  CUSTOMER_VISIBLE_UNAVAILABLE_DOCUMENT_TYPES,
  isCustomerVisibleDocumentType,
  normalizeDocumentType,
  shouldExposeCustomerDocument,
} from "@/lib/shipment-documents-visibility";

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

    if (type && !isCustomerVisibleDocumentType(type)) {
      return NextResponse.json({
        success: true,
        shipmentId,
        season,
        type,
        summary: {
          totalDocuments: 0,
          availableFiles: 0,
          unavailableFiles: 0,
        },
        unavailableTypes: [],
        total: 0,
        items: [],
      });
    }

    const payload = await listShipmentDocuments({
      shipmentId,
      season,
      type,
    });

    const visibleDocuments = payload.data!.filter(shouldExposeCustomerDocument);

    const items = visibleDocuments.map((document) => {
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

    let unavailableTypes: string[] = [];

    if (type) {
      if (
        items.length === 0 &&
        (payload.resumen?.total_documentos ?? 0) > 0 &&
        payload.data!.filter(shouldExposeCustomerDocument).length === 0
      ) {
        unavailableTypes = [normalizeDocumentType(type)];
      }
    } else {
      const availableTypes = new Set(
        items.map((item) => normalizeDocumentType(item.type)),
      );

      const unavailableResults = await Promise.all(
        CUSTOMER_VISIBLE_UNAVAILABLE_DOCUMENT_TYPES.filter(
          (documentType) =>
            !availableTypes.has(normalizeDocumentType(documentType)),
        ).map(async (documentType) => {
          const typedPayload = await listShipmentDocuments({
            shipmentId,
            season,
            type: documentType,
          });
          const visibleTypedDocuments =
            typedPayload.data?.filter(shouldExposeCustomerDocument) ?? [];

          return (typedPayload.resumen?.total_documentos ?? 0) > 0 &&
            visibleTypedDocuments.length === 0
            ? documentType
            : null;
        }),
      );

      unavailableTypes = unavailableResults.flatMap((documentType) =>
        documentType ? [documentType] : [],
      );
    }

    return NextResponse.json({
      success: true,
      shipmentId,
      season,
      type,
      summary: {
        totalDocuments: items.length + unavailableTypes.length,
        availableFiles: items.length,
        unavailableFiles: unavailableTypes.length,
      },
      unavailableTypes,
      total: items.length,
      items,
    });
  } catch (error) {
    return handleShipmentDocumentsApiError(error);
  }
}
