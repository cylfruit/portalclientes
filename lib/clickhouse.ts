import {
  type ContainerTrackingSnapshot,
  type EmbarqueRow,
  type PortalClientUser,
  type PortalReceiver,
  type ShipmentSeasonOption,
  type TrackingRoutePoint,
} from "@/lib/portal-data";
import {
  mapPortalClientUserRecordToView,
  type PortalClientUserFilters,
  type PortalClientUserLocale,
  type PortalClientUserModule,
  type PortalClientUserRecord,
  type PortalClientUserRoleKey,
  type PortalClientUserStatus,
} from "@/lib/portal-users";

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

const TRACKING_COLUMNS = [
  "tracked_at",
  "tracked_at_unix_ms",
  "tracking_finished",
  "container_number",
  "container_status",
  "container_status_code",
  "progress_percentage",
  "location_lat",
  "location_lng",
  "location_source",
  "origin_name",
  "origin_lat",
  "origin_lng",
  "destination_name",
  "destination_actual",
  "destination_lat",
  "destination_lng",
  "destination_date",
  "destination_date_type",
  "eta_real_source",
  "source_vessel_name",
  "vessel_name",
  "last_event_location_name",
  "last_event_status",
  "last_event_description",
  "last_event_date",
  "total_distance_km",
  "completed_distance_km",
  "remaining_distance_km",
  "events_json",
] as const;

const PORTAL_USER_COLUMNS = [
  "UserId",
  "Username",
  "Email",
  "FullName",
  "PasswordHash",
  "RoleKey",
  "PreferredLocale",
  "RecipientCode",
  "RecipientName",
  "RecipientGroupCode",
  "CanViewAll",
  "Modules",
  "Status",
  "TwoFactorEnabled",
  "RequiresPasswordReset",
  "RefreshTokenVersion",
  "LastAccessAt",
  "CreatedAt",
  "UpdatedAt",
  "Version",
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

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

function calculateTrackingProgressPercentage({
  totalDistanceKm,
  completedDistanceKm,
  remainingDistanceKm,
  fallbackPercentage,
}: {
  totalDistanceKm: number | null;
  completedDistanceKm: number | null;
  remainingDistanceKm: number | null;
  fallbackPercentage: number | null;
}) {
  const safeCompletedDistance =
    completedDistanceKm !== null ? Math.max(0, completedDistanceKm) : null;
  const safeRemainingDistance =
    remainingDistanceKm !== null ? Math.max(0, remainingDistanceKm) : null;

  if (
    totalDistanceKm !== null &&
    totalDistanceKm > 0 &&
    safeCompletedDistance !== null
  ) {
    return clampPercentage((safeCompletedDistance / totalDistanceKm) * 100);
  }

  if (
    safeCompletedDistance !== null &&
    safeRemainingDistance !== null &&
    safeCompletedDistance + safeRemainingDistance > 0
  ) {
    return clampPercentage(
      (safeCompletedDistance /
        (safeCompletedDistance + safeRemainingDistance)) *
        100,
    );
  }

  return fallbackPercentage !== null
    ? clampPercentage(fallbackPercentage)
    : null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = toNumberOrNull(value);
  return normalized !== null ? normalized !== 0 : false;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toStringOrNull(entry))
    .filter((entry): entry is string => entry !== null);
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

function pushTrackingRoutePoint(
  routePoints: TrackingRoutePoint[],
  seenPointKeys: Set<string>,
  point: TrackingRoutePoint,
) {
  const pointKey = [
    point.label.toLowerCase(),
    point.latitude.toFixed(4),
    point.longitude.toFixed(4),
  ].join("|");

  if (seenPointKeys.has(pointKey)) {
    return;
  }

  seenPointKeys.add(pointKey);
  routePoints.push(point);
}

function normalizeTrackingEventState(
  value: unknown,
): TrackingRoutePoint["state"] {
  const normalized = toStringOrNull(value)?.toLowerCase();

  switch (normalized) {
    case "completed":
      return "completed";
    case "active":
    case "current":
    case "in_progress":
      return "active";
    default:
      return "planned";
  }
}

function parseTrackingPointDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.getTime();
}

function buildTrackingRoutePoints(row: Record<string, unknown>) {
  const routePoints: TrackingRoutePoint[] = [];
  const seenPointKeys = new Set<string>();
  const completedEventPoints: Array<{
    point: TrackingRoutePoint;
    sortIndex: number;
    parsedDate: number | null;
  }> = [];
  const originLatitude = toNumberOrNull(row.origin_lat);
  const originLongitude = toNumberOrNull(row.origin_lng);
  const originName = toStringOrNull(row.origin_name) ?? "Origen";

  if (originLatitude !== null && originLongitude !== null) {
    pushTrackingRoutePoint(routePoints, seenPointKeys, {
      label: originName,
      latitude: originLatitude,
      longitude: originLongitude,
      state: "completed",
      date: toStringOrNull(row.tracked_at),
      description: "Origen del viaje",
    });
  }

  const rawEvents = toStringOrNull(row.events_json);

  if (rawEvents) {
    try {
      const parsedEvents = JSON.parse(rawEvents);

      if (Array.isArray(parsedEvents)) {
        parsedEvents.forEach((event) => {
          if (typeof event !== "object" || event === null) {
            return;
          }

          const eventRecord = event as Record<string, unknown>;
          const location =
            typeof eventRecord.location === "object" &&
            eventRecord.location !== null
              ? (eventRecord.location as Record<string, unknown>)
              : null;
          const latitude = toNumberOrNull(location?.lat);
          const longitude = toNumberOrNull(location?.lng);

          if (latitude === null || longitude === null) {
            return;
          }

          const descriptions = toStringArray(eventRecord.descriptions);
          const dates = toStringArray(eventRecord.dates);
          const state = normalizeTrackingEventState(eventRecord.status);

          if (state !== "completed") {
            return;
          }

          const date = dates[0] ?? null;

          completedEventPoints.push({
            sortIndex: completedEventPoints.length,
            parsedDate: parseTrackingPointDate(date),
            point: {
              label: toStringOrNull(location?.name) ?? "Evento",
              latitude,
              longitude,
              state: "completed",
              date,
              description: descriptions[0] ?? null,
            },
          });
        });
      }
    } catch {
      return routePoints;
    }
  }

  completedEventPoints
    .sort((left, right) => {
      if (left.parsedDate !== null && right.parsedDate !== null) {
        if (left.parsedDate !== right.parsedDate) {
          return left.parsedDate - right.parsedDate;
        }
      } else if (left.parsedDate !== null) {
        return -1;
      } else if (right.parsedDate !== null) {
        return 1;
      }

      return left.sortIndex - right.sortIndex;
    })
    .forEach(({ point }) => {
      pushTrackingRoutePoint(routePoints, seenPointKeys, point);
    });

  const currentLatitude = toNumberOrNull(row.location_lat);
  const currentLongitude = toNumberOrNull(row.location_lng);
  const locationSource = toStringOrNull(row.location_source);

  const { currentLabel, currentDescription, currentDate } = (() => {
    switch (locationSource) {
      case "PROGRESS_ESTIMATE":
        return {
          currentLabel: "Posicion estimada",
          currentDescription: "Posicion estimada por avance del tracking",
          currentDate: toStringOrNull(row.tracked_at),
        };
      case "CURRENT_POSITION": {
        const vesselLabel = toStringOrNull(row.vessel_name);
        return {
          currentLabel: vesselLabel
            ? `En navegacion - ${vesselLabel}`
            : "Posicion AIS",
          currentDescription: "Posicion satelital en tiempo real",
          currentDate:
            toStringOrNull(row.last_event_date) ??
            toStringOrNull(row.tracked_at),
        };
      }
      default:
        return {
          currentLabel:
            toStringOrNull(row.last_event_location_name) ??
            toStringOrNull(row.destination_name) ??
            "Posicion actual",
          currentDescription:
            toStringOrNull(row.last_event_description) ??
            "Ultima posicion reportada",
          currentDate:
            toStringOrNull(row.last_event_date) ??
            toStringOrNull(row.tracked_at),
        };
    }
  })();

  if (currentLatitude !== null && currentLongitude !== null) {
    pushTrackingRoutePoint(routePoints, seenPointKeys, {
      label: currentLabel,
      latitude: currentLatitude,
      longitude: currentLongitude,
      state: "active",
      date: currentDate,
      description: currentDescription,
    });
  }

  const destinationLatitude = toNumberOrNull(row.destination_lat);
  const destinationLongitude = toNumberOrNull(row.destination_lng);
  const destinationName = toStringOrNull(row.destination_name) ?? "Destino";
  const destinationActual = toBoolean(row.destination_actual);

  if (destinationLatitude !== null && destinationLongitude !== null) {
    pushTrackingRoutePoint(routePoints, seenPointKeys, {
      label: destinationName,
      latitude: destinationLatitude,
      longitude: destinationLongitude,
      state: destinationActual ? "completed" : "planned",
      date: toStringOrNull(row.destination_date),
      description: destinationActual
        ? "Arribo confirmado por tracking"
        : "Destino informado por tracking",
    });
  }

  return routePoints;
}

function normalizeTrackingSnapshot(
  row: Record<string, unknown>,
): ContainerTrackingSnapshot | null {
  const containerNumber = toStringOrNull(row.container_number);
  const currentLatitude = toNumberOrNull(row.location_lat);
  const currentLongitude = toNumberOrNull(row.location_lng);
  const totalDistanceKm = toNumberOrNull(row.total_distance_km);
  const completedDistanceKm = toNumberOrNull(row.completed_distance_km);
  const remainingDistanceKm = toNumberOrNull(row.remaining_distance_km);
  const progressPercentage = calculateTrackingProgressPercentage({
    totalDistanceKm,
    completedDistanceKm,
    remainingDistanceKm,
    fallbackPercentage: toNumberOrNull(row.progress_percentage),
  });

  if (
    !containerNumber ||
    currentLatitude === null ||
    currentLongitude === null
  ) {
    return null;
  }

  return {
    containerNumber,
    statusCode: toStringOrNull(row.container_status_code) ?? "IN_TRANSIT",
    statusLabel: toStringOrNull(row.container_status) ?? "En transito",
    trackedAt: toStringOrNull(row.tracked_at),
    locationSource: toStringOrNull(row.location_source) ?? "tracking",
    progressPercentage,
    currentLatitude,
    currentLongitude,
    originName: toStringOrNull(row.origin_name) ?? "Origen no informado",
    originLatitude: toNumberOrNull(row.origin_lat),
    originLongitude: toNumberOrNull(row.origin_lng),
    destinationName:
      toStringOrNull(row.destination_name) ?? "Destino no informado",
    destinationActual: toBoolean(row.destination_actual),
    destinationLatitude: toNumberOrNull(row.destination_lat),
    destinationLongitude: toNumberOrNull(row.destination_lng),
    etaReference:
      toStringOrNull(row.destination_date) ??
      toStringOrNull(row.eta_real_source),
    etaReferenceType:
      toStringOrNull(row.destination_date_type) ??
      (toStringOrNull(row.eta_real_source) ? "ETA source" : null),
    vesselName:
      toStringOrNull(row.vessel_name) ??
      toStringOrNull(row.source_vessel_name) ??
      "Nave no informada",
    lastEventLocationName: toStringOrNull(row.last_event_location_name),
    lastEventStatus: toStringOrNull(row.last_event_status),
    lastEventDescription: toStringOrNull(row.last_event_description),
    lastEventDate: toStringOrNull(row.last_event_date),
    totalDistanceKm,
    completedDistanceKm,
    remainingDistanceKm,
    routePoints: buildTrackingRoutePoints(row),
  };
}

function toPortalUserRoleKey(value: unknown): PortalClientUserRoleKey {
  const normalized = toStringOrNull(value);

  switch (normalized) {
    case "client":
    case "receiver_admin":
    case "admin":
    case "superuser":
      return normalized;
    default:
      return "receiver";
  }
}

function toPortalUserLocale(value: unknown): PortalClientUserLocale {
  const normalized = toStringOrNull(value);
  return normalized === "en" ? "en" : "es";
}

function toPortalUserStatus(value: unknown): PortalClientUserStatus {
  const normalized = toStringOrNull(value);

  switch (normalized) {
    case "Activo":
    case "Bloqueado":
      return normalized;
    default:
      return "Pendiente";
  }
}

function toPortalUserModules(value: unknown): PortalClientUserModule[] {
  return toStringArray(value).filter(
    (module): module is PortalClientUserModule =>
      ["Embarques", "Pallets", "Documentos", "Usuarios", "Alertas"].includes(
        module,
      ),
  );
}

function normalizePortalClientUserRecord(
  row: Record<string, unknown>,
): PortalClientUserRecord | null {
  const userId = toStringOrNull(row.UserId);
  const username = toStringOrNull(row.Username);
  const email = toStringOrNull(row.Email);
  const fullName = toStringOrNull(row.FullName);
  const passwordHash = toStringOrNull(row.PasswordHash);
  const createdAt = toStringOrNull(row.CreatedAt);
  const updatedAt = toStringOrNull(row.UpdatedAt);

  if (!userId || !username || !email || !fullName || !passwordHash) {
    return null;
  }

  return {
    userId,
    username,
    email,
    fullName,
    passwordHash,
    roleKey: toPortalUserRoleKey(row.RoleKey),
    preferredLocale: toPortalUserLocale(row.PreferredLocale),
    recipientCode: toStringOrNull(row.RecipientCode),
    recipientName: toStringOrNull(row.RecipientName),
    recipientGroupCode: toStringOrNull(row.RecipientGroupCode),
    canViewAll: toBoolean(row.CanViewAll),
    modules: toPortalUserModules(row.Modules),
    status: toPortalUserStatus(row.Status),
    twoFactorEnabled: toBoolean(row.TwoFactorEnabled),
    requiresPasswordReset: toBoolean(row.RequiresPasswordReset),
    refreshTokenVersion: toNumberOrNull(row.RefreshTokenVersion) ?? 1,
    lastAccessAt: toStringOrNull(row.LastAccessAt),
    createdAt: createdAt ?? new Date().toISOString(),
    updatedAt: updatedAt ?? createdAt ?? new Date().toISOString(),
    version: toNumberOrNull(row.Version) ?? Date.now(),
  };
}

function getPortalUsersTableName() {
  return escapeIdentifier(
    process.env.CLICKHOUSE_PORTAL_USERS_TABLE?.trim() || "PortalClientUsers",
  );
}

function formatClickHouseDateTimeValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toISOString().replace("T", " ").replace("Z", "");
}

function serializePortalClientUserRecord(record: PortalClientUserRecord) {
  return {
    UserId: record.userId,
    Username: record.username,
    Email: record.email,
    FullName: record.fullName,
    PasswordHash: record.passwordHash,
    RoleKey: record.roleKey,
    PreferredLocale: record.preferredLocale,
    RecipientCode: record.recipientCode,
    RecipientName: record.recipientName,
    RecipientGroupCode: record.recipientGroupCode,
    CanViewAll: record.canViewAll ? 1 : 0,
    Modules: record.modules,
    Status: record.status,
    TwoFactorEnabled: record.twoFactorEnabled ? 1 : 0,
    RequiresPasswordReset: record.requiresPasswordReset ? 1 : 0,
    RefreshTokenVersion: record.refreshTokenVersion,
    LastAccessAt: formatClickHouseDateTimeValue(record.lastAccessAt),
    CreatedAt: formatClickHouseDateTimeValue(record.createdAt),
    UpdatedAt: formatClickHouseDateTimeValue(record.updatedAt),
    Version: record.version,
  };
}

type ShipmentsQueryOptions = {
  season?: string | null;
  search?: string | null;
};

type ShipmentsFallbackQueryOptions = ShipmentsQueryOptions & {
  seasons?: ShipmentSeasonOption[];
};

function normalizeSeasonLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hasHiddenSeasonValue(value: string | null | undefined) {
  const normalized = normalizeSeasonLabel(value ?? "").toUpperCase();

  return (
    normalized === "T6" ||
    /\b2024\s*-\s*2025\b/.test(normalized) ||
    /\bT\s*6\b/.test(normalized)
  );
}

export function isHiddenEmbarqueSeason(
  season: Pick<ShipmentSeasonOption, "code" | "description"> | string | null | undefined,
) {
  if (!season) {
    return false;
  }

  if (typeof season === "string") {
    return hasHiddenSeasonValue(season);
  }

  return hasHiddenSeasonValue(season.code) || hasHiddenSeasonValue(season.description);
}

function appendSeasonCandidate(
  candidates: string[],
  value: string | null | undefined,
) {
  if (!value) {
    return;
  }

  const normalized = normalizeSeasonLabel(value);

  if (!normalized || candidates.includes(normalized)) {
    return;
  }

  candidates.push(normalized);
}

function buildSeasonCandidates(
  season: string,
  seasons: ShipmentSeasonOption[],
) {
  const candidates: string[] = [];
  const requestedSeason = normalizeSeasonLabel(season);
  appendSeasonCandidate(candidates, requestedSeason);

  const matchedSeason = seasons.find(
    (option) =>
      normalizeSeasonLabel(option.code) === requestedSeason ||
      normalizeSeasonLabel(option.description) === requestedSeason,
  );

  appendSeasonCandidate(candidates, matchedSeason?.code);
  appendSeasonCandidate(candidates, matchedSeason?.description);

  const seasonSources = [
    requestedSeason,
    matchedSeason?.code ?? "",
    matchedSeason?.description ?? "",
  ];
  const seasonTag = seasonSources
    .map((value) => value.match(/\bT\s*(\d{1,2})\b/i)?.[1] ?? null)
    .find((value) => Boolean(value));
  const yearRange = seasonSources
    .map((value) => value.match(/\b(20\d{2}\s*-\s*20\d{2})\b/)?.[1] ?? null)
    .find((value) => Boolean(value));

  if (seasonTag && yearRange) {
    const compactYearRange = yearRange.replace(/\s+/g, "");
    appendSeasonCandidate(candidates, `T${seasonTag} ${compactYearRange}`);
    appendSeasonCandidate(candidates, `T${seasonTag}${compactYearRange}`);
    appendSeasonCandidate(candidates, `T${seasonTag}-${compactYearRange}`);
  }

  return candidates;
}

function buildShipmentsQuery(options: ShipmentsQueryOptions = {}) {
  const view = escapeIdentifier(
    process.env.CLICKHOUSE_VIEW?.trim() || "vw_Embarques_pc",
  );
  const limit = Number(process.env.CLICKHOUSE_QUERY_LIMIT || "500");
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : 500;
  const season =
    options.season?.trim() ?? process.env.CLICKHOUSE_DEFAULT_SEASON?.trim();
  const search = options.search?.trim() ?? null;
  const conditions: string[] = [];

  if (season) {
    conditions.push(`CodigoTemporada = '${escapeStringLiteral(season)}'`);
  }

  if (search) {
    const escaped = escapeStringLiteral(search);
    conditions.push(
      `(positionCaseInsensitive(ifNull(BL, ''), '${escaped}') > 0 OR positionCaseInsensitive(ifNull(Contenedor, ''), '${escaped}') > 0 OR positionCaseInsensitive(ifNull(NomNave, ''), '${escaped}') > 0)`,
    );
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const shipmentKeyColumns = [
    "CodigoTemporadaKey",
    "NroEmbarqueKey",
    "CodRecibidorKey",
    "ContenedorKey",
    "BLKey",
    "BookingKey",
  ];
  const shipmentKeySelects = [
    "ifNull(toString(CodigoTemporada), '') AS CodigoTemporadaKey",
    "ifNull(toString(NroEmbarque), '') AS NroEmbarqueKey",
    "trim(BOTH ' ' FROM ifNull(CodRecibidor, '')) AS CodRecibidorKey",
    "trim(BOTH ' ' FROM ifNull(Contenedor, '')) AS ContenedorKey",
    "trim(BOTH ' ' FROM ifNull(BL, '')) AS BLKey",
    "trim(BOTH ' ' FROM ifNull(Booking_AWB, '')) AS BookingKey",
  ];

  return [
    "WITH shipment_source AS (",
    `  SELECT ${SHIPMENT_COLUMNS.join(", ")},`,
    `    ${shipmentKeySelects.join(",\n    ")}`,
    `  FROM ${view}`,
    whereClause ? `  ${whereClause}` : "",
    "),",
    "shipment_window AS (",
    `  SELECT ${shipmentKeyColumns.join(", ")},`,
    "    max(Fecha_ETD) AS MaxFechaETD",
    "  FROM shipment_source",
    `  GROUP BY ${shipmentKeyColumns.join(", ")}`,
    "  ORDER BY CodigoTemporadaKey DESC, MaxFechaETD DESC, toInt64OrZero(NroEmbarqueKey) DESC",
    `  LIMIT ${safeLimit}`,
    ")",
    `SELECT ${SHIPMENT_COLUMNS.map((column) => `shipment_source.${column}`).join(", ")}`,
    "FROM shipment_source",
    `INNER JOIN shipment_window USING (${shipmentKeyColumns.join(", ")})`,
    "ORDER BY shipment_source.CodigoTemporada DESC, shipment_source.Fecha_ETD DESC, shipment_source.NroEmbarque DESC",
    "FORMAT JSON",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildContainerTrackingQuery(containerNumbers: string[]) {
  const trackingTable = escapeIdentifier(
    process.env.CLICKHOUSE_TRACKING_TABLE?.trim() || "ContainerTrackingDaily",
  );
  const normalizedContainers = Array.from(
    new Set(
      containerNumbers
        .map((containerNumber) => containerNumber.trim())
        .filter(Boolean),
    ),
  );

  if (normalizedContainers.length === 0) {
    return "";
  }

  const containerList = normalizedContainers
    .map((containerNumber) => `'${escapeStringLiteral(containerNumber)}'`)
    .join(", ");

  return [
    "WITH latest_by_container AS (",
    `  SELECT ${TRACKING_COLUMNS.join(", ")}`,
    `  FROM ${trackingTable} FINAL`,
    "  WHERE api_success = 1",
    `    AND container_number IN (${containerList})`,
    "  ORDER BY container_number ASC, tracked_at_unix_ms DESC",
    "  LIMIT 1 BY container_number",
    ")",
    `SELECT ${TRACKING_COLUMNS.join(", ")}`,
    "FROM latest_by_container",
    "WHERE ifNull(tracking_finished, toUInt8(0)) != 1",
    "  AND location_lat IS NOT NULL",
    "  AND location_lng IS NOT NULL",
    "FORMAT JSON",
  ].join("\n");
}

function buildVesselTrackingQuery(vesselNames: string[]) {
  const trackingTable = escapeIdentifier(
    process.env.CLICKHOUSE_TRACKING_TABLE?.trim() || "ContainerTrackingDaily",
  );
  const normalizedVessels = Array.from(
    new Set(vesselNames.map((vesselName) => vesselName.trim()).filter(Boolean)),
  );

  if (normalizedVessels.length === 0) {
    return "";
  }

  const vesselKeyExpression =
    "lowerUTF8(trim(BOTH ' ' FROM ifNull(nullIf(vessel_name, ''), ifNull(source_vessel_name, ''))))";
  const vesselList = normalizedVessels
    .map((vesselName) => `lowerUTF8('${escapeStringLiteral(vesselName)}')`)
    .join(", ");

  return [
    "WITH latest_by_vessel AS (",
    `  SELECT ${TRACKING_COLUMNS.join(", ")},`,
    `    ${vesselKeyExpression} AS vessel_key`,
    `  FROM ${trackingTable} FINAL`,
    "  WHERE api_success = 1",
    `    AND ${vesselKeyExpression} IN (${vesselList})`,
    "  ORDER BY vessel_key ASC, tracked_at_unix_ms DESC",
    "  LIMIT 1 BY vessel_key",
    ")",
    `SELECT ${TRACKING_COLUMNS.join(", ")}`,
    "FROM latest_by_vessel",
    "WHERE ifNull(tracking_finished, toUInt8(0)) != 1",
    "  AND location_lat IS NOT NULL",
    "  AND location_lng IS NOT NULL",
    "FORMAT JSON",
  ].join("\n");
}

function buildPortalUsersQuery(filters: PortalClientUserFilters = {}) {
  const clauses = ["1 = 1"];
  const trimmedQuery = filters.q?.trim();
  const trimmedRecipientCode = filters.recipientCode?.trim();

  if (filters.status) {
    clauses.push(`Status = '${escapeStringLiteral(filters.status)}'`);
  }

  if (trimmedRecipientCode) {
    clauses.push(
      `RecipientCode = '${escapeStringLiteral(trimmedRecipientCode)}'`,
    );
  }

  if (trimmedQuery) {
    const escapedQuery = escapeStringLiteral(trimmedQuery);

    clauses.push(`(
      positionCaseInsensitiveUTF8(Username, '${escapedQuery}') > 0
      OR positionCaseInsensitiveUTF8(Email, '${escapedQuery}') > 0
      OR positionCaseInsensitiveUTF8(FullName, '${escapedQuery}') > 0
      OR positionCaseInsensitiveUTF8(ifNull(RecipientName, ''), '${escapedQuery}') > 0
    )`);
  }

  return [
    `SELECT ${PORTAL_USER_COLUMNS.join(", ")}`,
    `FROM ${getPortalUsersTableName()} FINAL`,
    `WHERE ${clauses.join("\n  AND ")}`,
    "ORDER BY UpdatedAt DESC, FullName ASC",
    "FORMAT JSON",
  ].join("\n");
}

function buildPortalUserByIdQuery(userId: string) {
  return [
    `SELECT ${PORTAL_USER_COLUMNS.join(", ")}`,
    `FROM ${getPortalUsersTableName()} FINAL`,
    `WHERE UserId = '${escapeStringLiteral(userId)}'`,
    "LIMIT 1",
    "FORMAT JSON",
  ].join("\n");
}

function buildPortalUserByFieldQuery(
  fieldName: "Username" | "Email",
  value: string,
) {
  return [
    `SELECT ${PORTAL_USER_COLUMNS.join(", ")}`,
    `FROM ${getPortalUsersTableName()} FINAL`,
    `WHERE lowerUTF8(${fieldName}) = lowerUTF8('${escapeStringLiteral(value)}')`,
    "LIMIT 1",
    "FORMAT JSON",
  ].join("\n");
}

function getPortalReceiversViewName() {
  return escapeIdentifier(
    process.env.CLICKHOUSE_RECEIVERS_VIEW?.trim() ||
      "PortalClientes.RECIBIDORES",
  );
}

function buildPortalReceiversQuery() {
  const receiversView = getPortalReceiversViewName();

  return [
    "SELECT",
    "  trim(BOTH ' ' FROM ifNull(CodigoRecibidor, '')) AS CodigoRecibidor,",
    "  trim(BOTH ' ' FROM ifNull(NombreRecibidor, '')) AS NombreRecibidor,",
    "  trim(BOTH ' ' FROM ifNull(RutRecibidor, '')) AS RutRecibidor,",
    "  toString(Temporada) AS Temporada",
    `FROM ${receiversView}`,
    "WHERE trim(BOTH ' ' FROM ifNull(CodigoRecibidor, '')) != ''",
    "ORDER BY Temporada DESC, NombreRecibidor ASC, CodigoRecibidor ASC",
    "FORMAT JSON",
  ].join("\n");
}

function buildPortalReceiverByCodeQuery(recipientCode: string) {
  const receiversView = getPortalReceiversViewName();

  return [
    "SELECT",
    "  trim(BOTH ' ' FROM ifNull(CodigoRecibidor, '')) AS CodigoRecibidor,",
    "  trim(BOTH ' ' FROM ifNull(NombreRecibidor, '')) AS NombreRecibidor,",
    "  trim(BOTH ' ' FROM ifNull(RutRecibidor, '')) AS RutRecibidor,",
    "  toString(Temporada) AS Temporada",
    `FROM ${receiversView}`,
    `WHERE trim(BOTH ' ' FROM ifNull(CodigoRecibidor, '')) = '${escapeStringLiteral(recipientCode)}'`,
    "ORDER BY Temporada DESC, NombreRecibidor ASC",
    "LIMIT 1",
    "FORMAT JSON",
  ].join("\n");
}

function normalizePortalReceiver(
  row: Record<string, unknown>,
): PortalReceiver | null {
  const code = toStringOrNull(row.CodigoRecibidor);

  if (!code) {
    return null;
  }

  return {
    code,
    name: toStringOrNull(row.NombreRecibidor) ?? code,
    rut: toStringOrNull(row.RutRecibidor),
    season: toStringOrNull(row.Temporada),
  };
}

async function executeClickHouseJsonQuery(query: string) {
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
    body: query,
    cache: "no-store",
    signal: AbortSignal.timeout(safeTimeoutMs),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`ClickHouse query failed (${response.status}): ${details}`);
  }

  return (await response.json()) as ClickHouseJsonResponse<
    Record<string, unknown>
  >;
}

async function executeClickHouseCommand(query: string) {
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
      Accept: "text/plain",
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: query,
    cache: "no-store",
    signal: AbortSignal.timeout(safeTimeoutMs),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(
      `ClickHouse command failed (${response.status}): ${details}`,
    );
  }

  return response.text();
}

export async function fetchEmbarqueRows(options: ShipmentsQueryOptions = {}) {
  if (options.season && isHiddenEmbarqueSeason(options.season)) {
    return [];
  }

  const payload = await executeClickHouseJsonQuery(
    buildShipmentsQuery(options),
  );

  return payload.data.map(normalizeRow);
}

export async function fetchEmbarqueRowsWithSeasonFallback(
  options: ShipmentsFallbackQueryOptions = {},
) {
  const season = options.season?.trim() ?? null;

  if (!season) {
    return fetchEmbarqueRows(options);
  }

  const seasonCandidates = buildSeasonCandidates(season, options.seasons ?? []);

  let lastRows: EmbarqueRow[] = [];

  for (const seasonCandidate of seasonCandidates) {
    const candidateRows = await fetchEmbarqueRows({
      season: seasonCandidate,
      search: options.search ?? null,
    });

    if (candidateRows.length > 0) {
      return candidateRows;
    }

    lastRows = candidateRows;
  }

  return lastRows;
}

export function resolveDefaultEmbarqueSeasonCode(
  seasons: ShipmentSeasonOption[],
) {
  return (
    seasons.find((season) => season.isActive)?.code ?? seasons[0]?.code ?? null
  );
}

export async function fetchEmbarqueSeasons(): Promise<ShipmentSeasonOption[]> {
  const table = escapeIdentifier(
    process.env.CLICKHOUSE_SEASONS_TABLE?.trim() || "default.TEMPORADAS",
  );
  const query = [
    "SELECT id, codigo_temporada, descripcion, Activo",
    `FROM ${table}`,
    "WHERE codigo_temporada IS NOT NULL",
    "  AND trim(BOTH ' ' FROM codigo_temporada) != ''",
    "ORDER BY toInt32OrZero(Activo) DESC, id DESC",
    `FORMAT JSON`,
  ].join("\n");

  const payload = await executeClickHouseJsonQuery(query);

  return payload.data
    .map((row) => {
      const code = toStringOrNull(row.codigo_temporada);

      if (!code) {
        return null;
      }

      return {
        code,
        description: toStringOrNull(row.descripcion) ?? code,
        isActive: toBoolean(row.Activo),
      };
    })
    .filter(
      (season): season is ShipmentSeasonOption =>
        season !== null && !isHiddenEmbarqueSeason(season),
    );
}

export async function fetchContainerTrackingSnapshots(
  containerNumbers: string[],
) {
  const query = buildContainerTrackingQuery(containerNumbers);

  if (!query) {
    return [];
  }

  const payload = await executeClickHouseJsonQuery(query);

  return payload.data
    .map(normalizeTrackingSnapshot)
    .filter(
      (trackingSnapshot): trackingSnapshot is ContainerTrackingSnapshot =>
        trackingSnapshot !== null,
    );
}

export async function fetchVesselTrackingSnapshots(vesselNames: string[]) {
  const query = buildVesselTrackingQuery(vesselNames);

  if (!query) {
    return [];
  }

  const payload = await executeClickHouseJsonQuery(query);

  return payload.data
    .map(normalizeTrackingSnapshot)
    .filter(
      (trackingSnapshot): trackingSnapshot is ContainerTrackingSnapshot =>
        trackingSnapshot !== null,
    );
}

export async function fetchPortalClientUserRecords(
  filters: PortalClientUserFilters = {},
) {
  const payload = await executeClickHouseJsonQuery(
    buildPortalUsersQuery(filters),
  );

  return payload.data
    .map(normalizePortalClientUserRecord)
    .filter(
      (userRecord): userRecord is PortalClientUserRecord => userRecord !== null,
    );
}

export async function fetchPortalClientUsers(
  filters: PortalClientUserFilters = {},
): Promise<PortalClientUser[]> {
  const records = await fetchPortalClientUserRecords(filters);
  return records.map(mapPortalClientUserRecordToView);
}

export async function fetchPortalClientUserRecordById(userId: string) {
  const payload = await executeClickHouseJsonQuery(
    buildPortalUserByIdQuery(userId),
  );
  return normalizePortalClientUserRecord(payload.data[0] ?? {});
}

export async function fetchPortalClientUserRecordByUsername(username: string) {
  const payload = await executeClickHouseJsonQuery(
    buildPortalUserByFieldQuery("Username", username),
  );
  return normalizePortalClientUserRecord(payload.data[0] ?? {});
}

export async function fetchPortalClientUserRecordByEmail(email: string) {
  const payload = await executeClickHouseJsonQuery(
    buildPortalUserByFieldQuery("Email", email),
  );
  return normalizePortalClientUserRecord(payload.data[0] ?? {});
}

export async function fetchPortalReceivers(): Promise<PortalReceiver[]> {
  const payload = await executeClickHouseJsonQuery(buildPortalReceiversQuery());
  const uniqueReceivers = new Map<string, PortalReceiver>();

  payload.data
    .map(normalizePortalReceiver)
    .filter((receiver): receiver is PortalReceiver => receiver !== null)
    .forEach((receiver) => {
      if (!uniqueReceivers.has(receiver.code)) {
        uniqueReceivers.set(receiver.code, receiver);
      }
    });

  return Array.from(uniqueReceivers.values()).sort((left, right) => {
    const nameOrder = left.name.localeCompare(right.name, "es");
    return nameOrder !== 0
      ? nameOrder
      : left.code.localeCompare(right.code, "es");
  });
}

export async function fetchPortalReceiverByCode(recipientCode: string) {
  const normalizedCode = recipientCode.trim();

  if (!normalizedCode) {
    return null;
  }

  const payload = await executeClickHouseJsonQuery(
    buildPortalReceiverByCodeQuery(normalizedCode),
  );

  return normalizePortalReceiver(payload.data[0] ?? {});
}

export async function upsertPortalClientUserRecord(
  record: PortalClientUserRecord,
) {
  const query = [
    `INSERT INTO ${getPortalUsersTableName()} (${PORTAL_USER_COLUMNS.join(", ")}) FORMAT JSONEachRow`,
    JSON.stringify(serializePortalClientUserRecord(record)),
  ].join("\n");

  await executeClickHouseCommand(query);
  return record;
}
