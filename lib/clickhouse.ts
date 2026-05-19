import { type EmbarqueRow } from "@/lib/portal-data";

const SHIPMENT_COLUMNS = [
  "NroEmbarque",
  "CodigoTemporada",
  "CodRecibidor",
  "Contenedor",
  "Consignatario",
  "NomRecibidor",
  "CodigoGrupoRecibidor",
  "NombreGrupoRecibidor",
  "Pallet",
  "CodEspecie",
  "NomEspecie",
  "CodVariedadEti",
  "NomVariedadEti",
  "TotalCajas",
  "PesoBrutoAduana",
  "PesoNeto",
  "CodigoProductorEti",
  "NomProductorEti",
  "FechaPack",
  "Termografo",
  "NomCategoria",
  "Fecha_ETD",
  "Fecha_ETA",
  "Fecha_ATD",
  "Fecha_ATA",
  "NomPuertoDestino",
  "NomPuertoZarpe",
  "NomPais",
  "NomExportador",
  "NombreNaviera",
  "BL",
  "Booking_AWB",
  "MasaBruta",
  "NomNave",
  "NomPLU",
  "NumeroCertificadoProductorEti",
  "Mercado_Cliente",
  "FDA",
] as const;

type ClickHouseJsonResponse<T> = {
  data: T[];
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value.trim();
}

function getClickHouseProtocol() {
  if (process.env.CLICKHOUSE_PROTOCOL?.trim()) {
    return process.env.CLICKHOUSE_PROTOCOL.trim();
  }

  return process.env.CLICKHOUSE_SECURE === "true" ? "https" : "http";
}

function getClickHousePort() {
  if (process.env.CLICKHOUSE_PORT?.trim()) {
    return process.env.CLICKHOUSE_PORT.trim();
  }

  return process.env.CLICKHOUSE_SECURE === "true" ? "8443" : "8123";
}

function escapeIdentifier(value: string) {
  if (!/^[A-Za-z0-9_.]+$/.test(value)) {
    throw new Error(`Invalid ClickHouse identifier: ${value}`);
  }

  return value;
}

function escapeStringLiteral(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function toStringOrNull(value: unknown) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toNumberOrNull(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeRow(row: Record<string, unknown>): EmbarqueRow {
  return {
    NroEmbarque: toNumberOrNull(row.NroEmbarque),
    CodigoTemporada: toStringOrNull(row.CodigoTemporada),
    CodRecibidor: toStringOrNull(row.CodRecibidor),
    Contenedor: toStringOrNull(row.Contenedor),
    Consignatario: toStringOrNull(row.Consignatario),
    NomRecibidor: toStringOrNull(row.NomRecibidor),
    CodigoGrupoRecibidor: toStringOrNull(row.CodigoGrupoRecibidor),
    NombreGrupoRecibidor: toStringOrNull(row.NombreGrupoRecibidor),
    Pallet: toStringOrNull(row.Pallet),
    CodEspecie: toStringOrNull(row.CodEspecie),
    NomEspecie: toStringOrNull(row.NomEspecie),
    CodVariedadEti: toStringOrNull(row.CodVariedadEti),
    NomVariedadEti: toStringOrNull(row.NomVariedadEti),
    TotalCajas: toNumberOrNull(row.TotalCajas),
    PesoBrutoAduana: toNumberOrNull(row.PesoBrutoAduana),
    PesoNeto: toNumberOrNull(row.PesoNeto),
    CodigoProductorEti: toStringOrNull(row.CodigoProductorEti),
    NomProductorEti: toStringOrNull(row.NomProductorEti),
    FechaPack: toStringOrNull(row.FechaPack),
    Termografo: toStringOrNull(row.Termografo),
    NomCategoria: toStringOrNull(row.NomCategoria),
    Fecha_ETD: toStringOrNull(row.Fecha_ETD),
    Fecha_ETA: toStringOrNull(row.Fecha_ETA),
    Fecha_ATD: toStringOrNull(row.Fecha_ATD),
    Fecha_ATA: toStringOrNull(row.Fecha_ATA),
    NomPuertoDestino: toStringOrNull(row.NomPuertoDestino),
    NomPuertoZarpe: toStringOrNull(row.NomPuertoZarpe),
    NomPais: toStringOrNull(row.NomPais),
    NomExportador: toStringOrNull(row.NomExportador),
    NombreNaviera: toStringOrNull(row.NombreNaviera),
    BL: toStringOrNull(row.BL),
    Booking_AWB: toStringOrNull(row.Booking_AWB),
    MasaBruta: toNumberOrNull(row.MasaBruta),
    NomNave: toStringOrNull(row.NomNave),
    NomPLU: toStringOrNull(row.NomPLU),
    NumeroCertificadoProductorEti: toStringOrNull(
      row.NumeroCertificadoProductorEti,
    ),
    Mercado_Cliente: toStringOrNull(row.Mercado_Cliente),
    FDA: toStringOrNull(row.FDA),
  };
}

function buildShipmentsQuery() {
  const view = escapeIdentifier(
    process.env.CLICKHOUSE_VIEW?.trim() || "vw_Embarques_pc",
  );
  const limit = Number(process.env.CLICKHOUSE_QUERY_LIMIT || "500");
  const defaultSeason = process.env.CLICKHOUSE_DEFAULT_SEASON?.trim();
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : 500;
  const whereClause = defaultSeason
    ? `WHERE CodigoTemporada = '${escapeStringLiteral(defaultSeason)}'`
    : "";

  return [
    `SELECT ${SHIPMENT_COLUMNS.join(", ")}`,
    `FROM ${view}`,
    whereClause,
    "ORDER BY CodigoTemporada DESC, Fecha_ETD DESC, NroEmbarque DESC",
    `LIMIT ${safeLimit}`,
    "FORMAT JSON",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function fetchEmbarqueRows() {
  const protocol = getClickHouseProtocol();
  const host = getRequiredEnv("CLICKHOUSE_HOST");
  const port = getClickHousePort();
  const database = getRequiredEnv("CLICKHOUSE_DATABASE");
  const user = getRequiredEnv("CLICKHOUSE_USER");
  const password = process.env.CLICKHOUSE_PASSWORD || "";
  const timeoutMs = Number(process.env.CLICKHOUSE_TIMEOUT_MS || "10000");
  const safeTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000;
  const url = new URL(`${protocol}://${host}:${port}/`);

  url.searchParams.set("database", database);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: buildShipmentsQuery(),
    cache: "no-store",
    signal: AbortSignal.timeout(safeTimeoutMs),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`ClickHouse query failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as ClickHouseJsonResponse<
    Record<string, unknown>
  >;

  return payload.data.map(normalizeRow);
}
