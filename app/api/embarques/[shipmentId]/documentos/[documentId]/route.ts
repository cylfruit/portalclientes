import { NextResponse, type NextRequest } from "next/server";
import {
  requireAuthenticatedApiUser,
  filterRowsForPortalUser,
} from "@/lib/auth";
import { fetchEmbarqueRows } from "@/lib/clickhouse";
import {
  fetchShipmentDocumentFile,
  ShipmentDocumentsApiError,
} from "@/lib/shipment-documents-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    shipmentId: string;
    documentId: string;
  }>;
};

function handleShipmentDocumentFileApiError(error: unknown) {
  if (error instanceof ShipmentDocumentsApiError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  console.error("Shipment document file API error", error);

  return NextResponse.json(
    {
      message:
        "No fue posible descargar el documento del embarque desde la API segura.",
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

  const visibleRows = filterRowsForPortalUser(await fetchEmbarqueRows(), user);

  return visibleRows.some(
    (row) =>
      String(row.NroEmbarque ?? "").trim() === shipmentId &&
      String(row.CodigoTemporada ?? "").trim() === season,
  );
}

function copyHeaderIfPresent(
  source: Headers,
  target: Headers,
  headerName: string,
) {
  const value = source.get(headerName);

  if (value) {
    target.set(headerName, value);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuthenticatedApiUser(request);

    if (auth.response) {
      return auth.response;
    }

    const { shipmentId, documentId } = await context.params;
    const season = request.nextUrl.searchParams.get("temporada")?.trim() || "";
    const disposition =
      request.nextUrl.searchParams.get("disposition") === "inline"
        ? "inline"
        : "attachment";

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

    const upstreamResponse = await fetchShipmentDocumentFile({
      shipmentId,
      documentId,
      season,
      disposition,
    });
    const headers = new Headers();

    copyHeaderIfPresent(upstreamResponse.headers, headers, "content-type");
    copyHeaderIfPresent(upstreamResponse.headers, headers, "content-length");
    copyHeaderIfPresent(
      upstreamResponse.headers,
      headers,
      "content-disposition",
    );
    copyHeaderIfPresent(upstreamResponse.headers, headers, "cache-control");
    copyHeaderIfPresent(upstreamResponse.headers, headers, "last-modified");
    copyHeaderIfPresent(upstreamResponse.headers, headers, "etag");

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error) {
    return handleShipmentDocumentFileApiError(error);
  }
}
