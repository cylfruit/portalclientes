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
    const items = payload.data!.map((document) => ({
      id: String(document.documento_id),
      shipmentId: String(document.embarque_id),
      season: document.temporada,
      type: document.tipo,
      status: document.estado,
      originalName: document.original_name,
      mimeType: document.mime_type,
      size: document.size,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
      viewUrl: `/api/embarques/${encodeURIComponent(shipmentId)}/documentos/${encodeURIComponent(String(document.documento_id))}?temporada=${encodeURIComponent(season)}&disposition=inline`,
      downloadUrl: `/api/embarques/${encodeURIComponent(shipmentId)}/documentos/${encodeURIComponent(String(document.documento_id))}?temporada=${encodeURIComponent(season)}&disposition=attachment`,
    }));

    return NextResponse.json({
      success: true,
      shipmentId,
      season,
      type,
      total: items.length,
      items,
    });
  } catch (error) {
    return handleShipmentDocumentsApiError(error);
  }
}
