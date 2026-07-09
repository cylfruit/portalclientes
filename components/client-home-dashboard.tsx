"use client";

import {
  Fragment,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
} from "react";
import dynamic from "next/dynamic";
import {
  buildShipmentsFromRows,
  type ContainerTrackingSnapshot,
  formatDate,
  formatNumber,
  type EmbarqueRow,
  type ShipmentSeasonOption,
  type ShipmentSummary,
  type TrackedShipmentItem,
} from "@/lib/portal-data";

const TrackingMap = dynamic(
  () => import("@/components/tracking-map").then((m) => m.TrackingMap),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

type PortalLocale = "es" | "en";

type SearchField = "all" | "container" | "shipment" | "booking";

type ShipmentStatusFilter = ShipmentSummary["status"];

type ShipmentDocumentItem = {
  id: string;
  shipmentId: string;
  season: string;
  type: string;
  status: string;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  viewUrl: string;
  downloadUrl: string;
};

type ShipmentDocumentsResponse = {
  summary?: {
    totalDocuments?: number;
    availableFiles?: number;
    unavailableFiles?: number;
  };
  courier?: ShipmentCourierInfo | null;
  unavailableTypes?: string[];
  items?: ShipmentDocumentItem[];
  message?: string;
};

type ShipmentCourierInfo = {
  available: boolean;
  noNecesitaCourier: boolean;
  trackingNumber: string | null;
  courierName: string | null;
  completedAt: string | null;
  status: string | null;
};

type ShipmentDocumentsLoadState = {
  status: "idle" | "loading" | "loaded" | "error";
  items: ShipmentDocumentItem[];
  unavailableTypes: string[];
  summary: {
    totalDocuments: number;
    availableFiles: number;
    unavailableFiles: number;
  };
  courier: ShipmentCourierInfo | null;
  errorMessage: string | null;
};

const EMPTY_DOCS_STATE: ShipmentDocumentsLoadState = {
  status: "idle",
  items: [],
  unavailableTypes: [],
  summary: {
    totalDocuments: 0,
    availableFiles: 0,
    unavailableFiles: 0,
  },
  courier: null,
  errorMessage: null,
};

export type ClientHomeDashboardProps = {
  locale: PortalLocale;
  rows: EmbarqueRow[];
  trackingSnapshots: ContainerTrackingSnapshot[];
  vesselTrackingSnapshots: ContainerTrackingSnapshot[];
  seasons: ShipmentSeasonOption[];
  defaultSeason: string | null;
  errorMessage?: string | null;
  trackingErrorMessage?: string | null;
};

// ─── Copy ─────────────────────────────────────────────────────────────────────

const dashboardCopy = {
  es: {
    inTransit: "EN TRÁNSITO",
    inTransitSub: "Contenedores en ruta",
    arrivingSoon: "POR ZARPAR",
    arrivingSoonSub: "Embarques pendientes de zarpe",
    docsReady: "ARRIBADOS",
    docsReadySub: "Embarques ya arribados del cliente",
    searchPlaceholder: "Buscar por embarque, booking o contenedor...",
    searchingResults: "Buscando resultados...",
    operationalErrorTitle: "Aviso operativo",
    trackingWarningTitle: "Tracking parcial",
    filtersRegionLabel: "Filtros de embarques",
    searchLabel: "Buscar embarques",
    searchByLabel: "Buscar por",
    searchFieldLabel: "Campo de busqueda",
    searchByAll: "Todos",
    searchByContainer: "Contenedor",
    searchByShipment: "Nro embarque",
    searchByBooking: "Booking",
    seasonLabel: "Temporada",
    seasonSelectLabel: "Seleccionar temporada",
    etdFromLabel: "ETD desde",
    etdToLabel: "ETD hasta",
    etaFromLabel: "ETA desde",
    etaToLabel: "ETA hasta",
    clearFilters: "Limpiar filtros",
    exportExcel: "Exportar a Excel",
    misEmbarques: "Mis Embarques",
    shipmentsShowing: "embarques",
    colStatus: "Embarque",
    colContainer: "Contenedor / Booking",
    colRoute: "Ruta y Nave",
    colDates: "ETD → ETA",
    colActions: "Acciones",
    viewDetails: "Ver Detalles",
    hideDetails: "Ocultar Detalles",
    noShipmentsTitle: "Sin embarques para esta búsqueda",
    noShipmentsDescription:
      "Ajusta los filtros o cambia la temporada para ver los embarques disponibles.",
    prev: "Anterior",
    next: "Siguiente",
    loadingNewSeason: "Cargando temporada...",
    docsCenter: "Centro de Documentos",
    docsHint: "Los archivos se consultan en vivo por embarque y temporada.",
    courierTitle: "Courier documental",
    courierTracking: "Nro. tracking",
    courierCompany: "Courier",
    courierDate: "Actualizado",
    courierNotRequired: "Este embarque no requiere courier documental.",
    loadDocs: "Cargar Documentos",
    reloadDocs: "Recargar",
    loadingDocs: "Cargando documentos...",
    docsLoadFailed: "No fue posible cargar los documentos de este embarque.",
    noDocsAvailable: "No hay archivos disponibles para este embarque.",
    docRegisteredUnavailable:
      "Documento registrado, pero archivo no disponible.",
    openDocument: "Ver archivo",
    download: "Descargar PDF",
    retry: "Reintentar",
    close: "Cerrar",
    noData: "Sin dato",
    fileSize: "Tamaño",
    docUpdatedAt: "Actualizado",
    trackingTitle: "Trayecto del embarque",
    stepLoaded: "Carga Lista",
    stepDeparted: "Zarpe",
    stepInTransit: "En Tránsito",
    stepArrived: "Arribo",
    vessel: "Nave",
    containerLabel: "Contenedor",
    blLabel: "BL",
    bookingLabel: "Booking",
    etdLabel: "ETD",
    etaLabel: "ETA",
    atdLabel: "ATD",
    ataLabel: "ATA",
    exportReceiverLabel: "Recibidor",
    exportConsigneeLabel: "Consignatario",
    exportBoxesLabel: "Cajas",
    exportStatusLabel: "Estado",
    trackingProgress: "Avance estimado",
    trackingMapDescription:
      "Mapa interactivo con rutas maritimas y posiciones aproximadas de contenedores. Usa los controles del mapa o selecciona un marcador para ver el embarque relacionado.",
    showInTable: "Ver en tabla",
    clearMapSelection: "Quitar seleccion del mapa",
    csvFilePrefix: "embarques-clientes",
    arrivedLabel: "Arribado",
    scheduledLabel: "Por zarpar",
    inTransitLabel: "En tránsito",
    originPort: "Puerto origen",
    destinationPort: "Puerto destino",
    pageOf: (page: number, total: number) => `Pág. ${page} de ${total}`,
    summaryFilterLabel: (label: string, count: number, subtitle: string) =>
      `${label}: ${formatNumber(count)}. ${subtitle}`,
    toggleDetailsFor: (shipmentId: string) =>
      `Mostrar u ocultar detalle del embarque ${shipmentId}`,
  },
  en: {
    inTransit: "IN TRANSIT",
    inTransitSub: "Containers en route",
    arrivingSoon: "TO DEPART",
    arrivingSoonSub: "Shipments pending departure",
    docsReady: "ARRIVED",
    docsReadySub: "Client shipments already arrived",
    searchPlaceholder: "Search by shipment, booking or container...",
    searchingResults: "Searching results...",
    operationalErrorTitle: "Operational notice",
    trackingWarningTitle: "Partial tracking",
    filtersRegionLabel: "Shipment filters",
    searchLabel: "Search shipments",
    searchByLabel: "Search by",
    searchFieldLabel: "Search field",
    searchByAll: "All",
    searchByContainer: "Container",
    searchByShipment: "Shipment no.",
    searchByBooking: "Booking",
    seasonLabel: "Season",
    seasonSelectLabel: "Select season",
    etdFromLabel: "ETD from",
    etdToLabel: "ETD to",
    etaFromLabel: "ETA from",
    etaToLabel: "ETA to",
    clearFilters: "Clear filters",
    exportExcel: "Export to Excel",
    misEmbarques: "My Shipments",
    shipmentsShowing: "shipments",
    colStatus: "Shipment",
    colContainer: "Container / Booking",
    colRoute: "Route & Vessel",
    colDates: "ETD → ETA",
    colActions: "Actions",
    viewDetails: "View Details",
    hideDetails: "Hide Details",
    noShipmentsTitle: "No shipments for this search",
    noShipmentsDescription:
      "Adjust the filters or change the season to see available shipments.",
    prev: "Previous",
    next: "Next",
    loadingNewSeason: "Loading season...",
    docsCenter: "Document Center",
    docsHint: "Files are fetched live by shipment and season.",
    courierTitle: "Document courier",
    courierTracking: "Tracking no.",
    courierCompany: "Courier",
    courierDate: "Updated",
    courierNotRequired: "This shipment does not require document courier.",
    loadDocs: "Load Documents",
    reloadDocs: "Reload",
    loadingDocs: "Loading documents...",
    docsLoadFailed: "Could not load the shipment documents.",
    noDocsAvailable: "No files available for this shipment.",
    docRegisteredUnavailable:
      "Document is registered, but the file is unavailable.",
    openDocument: "View file",
    download: "Download PDF",
    retry: "Retry",
    close: "Close",
    noData: "No data",
    fileSize: "File size",
    docUpdatedAt: "Updated",
    trackingTitle: "Shipment journey",
    stepLoaded: "Loaded",
    stepDeparted: "Departed",
    stepInTransit: "In Transit",
    stepArrived: "Arrived",
    vessel: "Vessel",
    containerLabel: "Container",
    blLabel: "BL",
    bookingLabel: "Booking",
    etdLabel: "ETD",
    etaLabel: "ETA",
    atdLabel: "ATD",
    ataLabel: "ATA",
    exportReceiverLabel: "Receiver",
    exportConsigneeLabel: "Consignee",
    exportBoxesLabel: "Boxes",
    exportStatusLabel: "Status",
    trackingProgress: "Estimated progress",
    trackingMapDescription:
      "Interactive map with ocean routes and approximate container positions. Use the map controls or select a marker to inspect the related shipment.",
    showInTable: "Show in table",
    clearMapSelection: "Clear map selection",
    csvFilePrefix: "client-shipments",
    arrivedLabel: "Arrived",
    scheduledLabel: "Scheduled",
    inTransitLabel: "In transit",
    originPort: "Origin port",
    destinationPort: "Destination port",
    pageOf: (page: number, total: number) => `Pg. ${page} of ${total}`,
    summaryFilterLabel: (label: string, count: number, subtitle: string) =>
      `${label}: ${formatNumber(count)}. ${subtitle}`,
    toggleDetailsFor: (shipmentId: string) =>
      `Show or hide details for shipment ${shipmentId}`,
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeContainerKey(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function normalizeVesselKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function extractComparableDate(value: string | null | undefined) {
  if (!value) return null;

  const dateMatch = value.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    return dateMatch[0];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function matchesDateRange(
  value: string | null | undefined,
  from: string,
  to: string,
) {
  if (!from && !to) {
    return true;
  }

  const comparableDate = extractComparableDate(value);
  if (!comparableDate) {
    return false;
  }

  if (from && comparableDate < from) {
    return false;
  }

  if (to && comparableDate > to) {
    return false;
  }

  return true;
}

function shouldRenderShipmentInMap(shipment: ShipmentSummary) {
  return shipment.status !== "Arribado";
}

function normalizeSeasonFilterValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function appendSeasonFilterValue(values: Set<string>, value: string | null | undefined) {
  const normalized = normalizeSeasonFilterValue(value);

  if (normalized) {
    values.add(normalized);
  }
}

function buildSeasonFilterValues(
  selectedSeason: string,
  seasons: ShipmentSeasonOption[],
) {
  const values = new Set<string>();
  const normalizedSelectedSeason = normalizeSeasonFilterValue(selectedSeason);

  appendSeasonFilterValue(values, selectedSeason);

  if (!normalizedSelectedSeason) {
    return values;
  }

  const matchedSeason = seasons.find(
    (season) =>
      normalizeSeasonFilterValue(season.code) === normalizedSelectedSeason ||
      normalizeSeasonFilterValue(season.description) ===
        normalizedSelectedSeason,
  );

  appendSeasonFilterValue(values, matchedSeason?.code);
  appendSeasonFilterValue(values, matchedSeason?.description);

  return values;
}

function matchesSeasonFilter(
  shipment: ShipmentSummary,
  seasonFilterValues: Set<string>,
) {
  if (seasonFilterValues.size === 0) {
    return true;
  }

  return seasonFilterValues.has(normalizeSeasonFilterValue(shipment.season));
}

function matchesSearchField(
  shipment: ShipmentSummary,
  query: string,
  searchField: SearchField,
) {
  if (!query) {
    return true;
  }

  const shipmentId = shipment.id.toLowerCase();
  const booking = shipment.booking.toLowerCase();
  const container = shipment.container.toLowerCase();

  switch (searchField) {
    case "container":
      return container.includes(query);
    case "shipment":
      return shipmentId === query;
    case "booking":
      return booking.includes(query);
    default:
      if (shipmentId === query) {
        return true;
      }

      if (/^\d+$/.test(query)) {
        return false;
      }

      return booking.includes(query) || container.includes(query);
  }
}

function formatTrackingDate(
  value: string | null | undefined,
  locale: PortalLocale,
): string {
  if (!value) return dashboardCopy[locale].noData;
  const dateMatch = value.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) return formatDate(dateMatch[0], locale);
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return formatDate(parsed.toISOString().slice(0, 10), locale);
}

function getDecimalFormatter(locale: PortalLocale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatProgress(
  value: number | null | undefined,
  locale: PortalLocale,
) {
  if (value == null) return dashboardCopy[locale].noData;
  return `${getDecimalFormatter(locale).format(value)}%`;
}

function normalizeTrackingProgress(
  value: number | null | undefined,
  hasArrived: boolean,
) {
  if (value == null) {
    return null;
  }

  const normalized = Math.min(100, Math.max(0, value));

  if (!hasArrived && normalized >= 100) {
    return 99;
  }

  return normalized;
}

function formatFileSize(
  value: number | null | undefined,
  locale: PortalLocale,
) {
  if (value == null || value <= 0) return dashboardCopy[locale].noData;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${getDecimalFormatter(locale).format(size)} ${units[unitIndex]}`;
}

function shipmentStatusBadge(status: ShipmentSummary["status"]) {
  switch (status) {
    case "Arribado":
      return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
    case "En transito":
      return "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700";
    default:
      return "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700";
  }
}

function statusLabel(status: ShipmentSummary["status"], locale: PortalLocale) {
  const c = dashboardCopy[locale];
  switch (status) {
    case "Arribado":
      return c.arrivedLabel;
    case "En transito":
      return c.inTransitLabel;
    default:
      return c.scheduledLabel;
  }
}

function documentStateBadgeDot(state: string) {
  const up = state.trim().toUpperCase();
  switch (up) {
    case "EMITIDO":
    case "CONFIRMADO":
    case "COMPLETO":
    case "VIGENTE":
    case "CARGADO":
    case "DISPONIBLE":
      return "h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500";
    case "PARCIAL":
      return "h-2 w-2 flex-shrink-0 rounded-full bg-amber-400";
    default:
      return "h-2 w-2 flex-shrink-0 rounded-full bg-slate-300";
  }
}

function translateDocumentState(state: string, locale: PortalLocale) {
  const up = state.trim().toUpperCase();
  if (up === "") return dashboardCopy[locale].noData;
  if (locale === "es") {
    switch (up) {
      case "LOADED":
      case "CARGADO":
        return "Cargado";
      case "DISPONIBLE":
        return "Disponible";
      case "NO_DISPONIBLE":
        return "No disponible";
      default:
        return state;
    }
  }
  switch (up) {
    case "EMITIDO":
      return "Issued";
    case "CONFIRMADO":
      return "Confirmed";
    case "COMPLETO":
      return "Complete";
    case "VIGENTE":
      return "Current";
    case "PARCIAL":
      return "Partial";
    case "PENDIENTE":
      return "Pending";
    case "CARGADO":
    case "LOADED":
      return "Uploaded";
    case "DISPONIBLE":
      return "Available";
    case "NO_DISPONIBLE":
      return "Unavailable";
    default:
      return state;
  }
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  if (/[";\n]/.test(normalized)) return `"${normalized.replaceAll('"', '""')}"`;
  return normalized;
}

function downloadShipmentsAsCsv(
  shipments: ShipmentSummary[],
  locale: PortalLocale,
) {
  const c = dashboardCopy[locale];
  const headers = [
    "SHIPMENT",
    c.seasonLabel,
    c.exportReceiverLabel,
    c.exportConsigneeLabel,
    c.originPort,
    c.destinationPort,
    c.vessel,
    c.containerLabel,
    c.exportBoxesLabel,
    c.etdLabel,
    c.etaLabel,
    c.exportStatusLabel,
  ];

  const lines = shipments.map((s) =>
    [
      s.id,
      s.season,
      s.recipientName,
      s.consignee,
      s.originPort,
      s.destinationPort,
      s.vesselName,
      s.container,
      s.totalBoxes,
      s.etd,
      s.eta,
      statusLabel(s.status, locale),
    ]
      .map(escapeCsvValue)
      .join(";"),
  );

  const csvContent = `\uFEFF${headers.join(";")}\n${lines.join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${c.csvFilePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 3.5 3.5" />
    </svg>
  );
}

function SpinnerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} dashboard-spinner`}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.22"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="m5 12.5 5-5 5 5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M4 18h16" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path d="M12 2C8.7 2 6 4.7 6 8c0 5 6 13 6 13s6-8 6-13c0-3.3-2.7-6-6-6Z" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  count,
  subtitle,
  accentClass,
  ariaLabel,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  subtitle: string;
  accentClass: string;
  ariaLabel: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={ariaLabel}
      className={`rounded-[1.6rem] border bg-white p-6 text-left shadow-[0_16px_40px_rgba(13,13,13,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(13,13,13,0.14)] ${
        isActive
          ? "border-cyl-gold ring-2 ring-cyl-gold/45"
          : "border-black/8"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.2em] ${accentClass}`}
      >
        {label}
      </p>
      <p className="mt-3 text-5xl font-semibold tracking-[-0.03em] text-[#0f172a]">
        {formatNumber(count)}
      </p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </button>
  );
}

function ShipmentDocumentsGrid({
  copy,
  locale,
  state,
  onRetry,
}: {
  copy: (typeof dashboardCopy)[PortalLocale];
  locale: PortalLocale;
  state: ShipmentDocumentsLoadState;
  onRetry: () => void;
}) {
  if (
    (state.status === "idle" || state.status === "loading") &&
    state.items.length === 0
  ) {
    return (
      <div className="mt-4 rounded-[1.1rem] border border-black/8 bg-white/80 px-4 py-4 text-sm font-medium text-cyl-ink/68">
        {copy.loadingDocs}
      </div>
    );
  }

  if (state.status === "error" && state.items.length === 0) {
    return (
      <div className="mt-4 rounded-[1.1rem] border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-900">
        <p>{state.errorMessage ?? copy.docsLoadFailed}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
        >
          <SparkleIcon />
          {copy.retry}
        </button>
      </div>
    );
  }

  if (state.status === "loaded" && state.items.length === 0) {
    if (state.unavailableTypes.length > 0) {
      return (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {state.unavailableTypes.map((documentType) => (
            <div
              key={`unavailable-${documentType}`}
              className="rounded-[1.1rem] border border-amber-200 bg-amber-50/90 px-4 py-4 text-amber-900 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-snug">
                  {documentType}
                </p>
                <span className="shrink-0 text-xs font-medium">
                  {translateDocumentState("NO_DISPONIBLE", locale)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6">
                {copy.docRegisteredUnavailable}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mt-4 rounded-[1.1rem] border border-black/8 bg-white/80 px-4 py-4 text-sm text-cyl-ink/68">
        {copy.noDocsAvailable}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {state.status === "loading" ? (
        <div className="rounded-2xl border border-black/8 bg-[#eef6fb] px-4 py-3 text-sm text-cyl-ink/72">
          {copy.loadingDocs}
        </div>
      ) : null}

      {state.status === "error" && state.errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          {state.errorMessage}
        </div>
      ) : null}

      {state.unavailableTypes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.unavailableTypes.map((documentType) => (
            <div
              key={`unavailable-${documentType}`}
              className="rounded-[1.1rem] border border-amber-200 bg-amber-50/90 px-4 py-4 text-amber-900 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-snug">
                  {documentType}
                </p>
                <span className="shrink-0 text-xs font-medium">
                  {translateDocumentState("NO_DISPONIBLE", locale)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6">
                {copy.docRegisteredUnavailable}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {state.items.map((doc) => (
          <div
            key={doc.id}
            className="rounded-[1.1rem] border border-black/8 bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className={`mt-1 ${documentStateBadgeDot(doc.status)}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-cyl-ink">
                    {doc.type}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-cyl-ink/55">
                    {doc.originalName ?? copy.noData}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-cyl-ink/55">
                {translateDocumentState(doc.status, locale)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-cyl-ink/50">
              <span>
                {copy.fileSize}: {formatFileSize(doc.size, locale)}
              </span>
              <span>
                {copy.docUpdatedAt}: {formatTrackingDate(doc.updatedAt, locale)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={doc.viewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#1f2937]/85 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#111827]"
              >
                <EyeIcon />
                {copy.openDocument}
              </a>
              <a
                href={doc.downloadUrl}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#059669] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#047857]"
              >
                <DownloadIcon />
                {copy.download}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShipmentCourierCard({
  courier,
  copy,
  locale,
}: {
  courier: ShipmentCourierInfo;
  copy: (typeof dashboardCopy)[PortalLocale];
  locale: PortalLocale;
}) {
  if (!courier.available) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-cyl-gold/28 bg-gradient-to-br from-[#fff8e6] via-white to-[#f6efdf] text-sm text-cyl-ink shadow-[0_14px_34px_rgba(17,11,2,0.09)]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#151515] text-lg font-black text-cyl-gold shadow-sm">
            C
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a5a12]">
                {copy.courierTitle}
              </p>
              <span className="rounded-full border border-emerald-500/18 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                {courier.noNecesitaCourier ? "No aplica" : "Disponible"}
              </span>
            </div>
            {courier.noNecesitaCourier ? (
              <p className="mt-2 font-semibold text-cyl-ink">
                {copy.courierNotRequired}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-cyl-line bg-white/75 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyl-muted">
                    {copy.courierCompany}
                  </p>
                  <p className="mt-1 font-semibold text-cyl-ink">
                    {courier.courierName ?? copy.noData}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyl-line bg-white/75 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyl-muted">
                    {copy.courierTracking}
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-bold text-cyl-ink">
                    {courier.trackingNumber ?? copy.noData}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyl-line bg-white/75 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyl-muted">
                    {copy.courierDate}
                  </p>
                  <p className="mt-1 font-semibold text-cyl-ink">
                    {formatTrackingDate(courier.completedAt, locale)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackingTimeline({
  shipment,
  tracking,
  copy,
  locale,
}: {
  shipment: ShipmentSummary;
  tracking: ContainerTrackingSnapshot | null;
  copy: (typeof dashboardCopy)[PortalLocale];
  locale: PortalLocale;
}) {
  // Fecha_ATA and Fecha_ATD in the DB view are always populated (ATA = ETA, ATD = ETD).
  // Only treat them as "done" when the date has already passed.
  const today = new Date().toISOString().slice(0, 10);
  const hasEtd = Boolean(shipment.etd);
  // tracking !== null means the container is being actively tracked → it has departed
  const hasAtd =
    Boolean(shipment.atd && shipment.atd <= today) || tracking !== null;
  const hasAta = Boolean(shipment.ata && shipment.ata <= today);

  // Actual departure date: prefer first completed routePoint from tracking events
  const trackingDeparturePoint = tracking?.routePoints?.find(
    (p) => p.state === "completed" && p.date,
  );
  const departureDate = trackingDeparturePoint?.date
    ? formatTrackingDate(trackingDeparturePoint.date, locale)
    : hasAtd && shipment.atd
      ? formatDate(shipment.atd, locale)
      : hasEtd
        ? formatDate(shipment.etd, locale)
        : null;

  // Use tracking ETA if available (more accurate than internal DB ETD/ETA)
  const etaDisplay = hasAta
    ? formatDate(shipment.ata, locale)
    : tracking?.etaReference
      ? formatTrackingDate(tracking.etaReference, locale)
      : shipment.eta
        ? formatDate(shipment.eta, locale)
        : null;
  const etaIsEstimate =
    !hasAta && Boolean(tracking?.etaReference ?? shipment.eta);
  const etaSubtitle = etaIsEstimate
    ? tracking?.etaReference
      ? locale === "es"
        ? "ETA (tracking)"
        : "ETA (tracking)"
      : locale === "es"
        ? "ETA estimado"
        : "Estimated ETA"
    : null;
  const displayProgress = normalizeTrackingProgress(
    tracking?.progressPercentage,
    hasAta,
  );

  // Last known tracking event for In Transit step
  const inTransitDate = tracking?.lastEventDate
    ? formatTrackingDate(tracking.lastEventDate, locale)
    : null;
  const inTransitSubtitle =
    tracking?.lastEventLocationName ?? tracking?.lastEventDescription ?? null;

  type Step = {
    label: string;
    date: string | null;
    subtitle: string | null;
    done: boolean;
    active: boolean;
  };

  const steps: Step[] = [
    {
      label: copy.stepLoaded,
      date: hasEtd ? formatDate(shipment.etd, locale) : null,
      subtitle: null,
      // cargo is "loaded/ready" once we have an ETD
      done: hasEtd,
      active: false,
    },
    {
      label: copy.stepDeparted,
      date: departureDate,
      subtitle: null,
      done: hasAtd,
      // ETD is set but vessel hasn't actually departed yet
      active: hasEtd && !hasAtd,
    },
    {
      label: copy.stepInTransit,
      date: inTransitDate,
      subtitle: hasAtd && !hasAta ? inTransitSubtitle : null,
      done: hasAta,
      active: hasAtd && !hasAta,
    },
    {
      label: copy.stepArrived,
      date: etaDisplay,
      subtitle: etaSubtitle,
      done: hasAta,
      active: false,
    },
  ];

  // Connector between step i-1 and step i is green when step i-1 is done
  function connectorColor(index: number, side: "left" | "right") {
    if (side === "left") {
      if (index === 0) return "invisible";
      return steps[index - 1].done ? "bg-emerald-400" : "bg-slate-200";
    }
    if (index === steps.length - 1) return "invisible";
    return steps[index].done ? "bg-emerald-400" : "bg-slate-200";
  }

  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-cyl-ink/55">
        {copy.trackingTitle}
      </p>
      <div className="flex items-start">
        {steps.map((step, index) => (
          <div key={step.label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={`h-0.5 flex-1 ${connectorColor(index, "left")}`}
              />
              <div
                className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                  step.done
                    ? "border-emerald-500 bg-emerald-500"
                    : step.active
                      ? "border-sky-500 bg-sky-100"
                      : "border-slate-300 bg-white"
                }`}
              />
              <div
                className={`h-0.5 flex-1 ${connectorColor(index, "right")}`}
              />
            </div>
            <p
              className={`mt-2 text-center text-[0.65rem] font-semibold leading-tight ${
                step.done
                  ? "text-emerald-600"
                  : step.active
                    ? "text-sky-600"
                    : "text-slate-400"
              }`}
            >
              {step.label}
            </p>
            {step.date ? (
              <p className="mt-0.5 text-center text-[0.6rem] text-cyl-ink/45">
                {step.date}
              </p>
            ) : null}
            {step.subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-center text-[0.58rem] leading-tight text-cyl-ink/35">
                {step.subtitle}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {tracking && displayProgress !== null ? (
        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-xs text-cyl-ink/55">
            <span>{copy.trackingProgress}</span>
            <span>{formatProgress(displayProgress, locale)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div
              className="h-1.5 rounded-full bg-sky-500"
              role="progressbar"
              aria-label={copy.trackingProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(displayProgress)}
              style={{
                width: `${displayProgress}%`,
              }}
            />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-cyl-ink/50">
            <MapPinIcon />
            <span>
              {tracking.lastEventLocationName ?? tracking.destinationName}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShipmentExpandedRow({
  shipment,
  tracking,
  docsState,
  copy,
  locale,
  onLoadDocs,
  onReloadDocs,
  onClose,
}: {
  shipment: ShipmentSummary;
  tracking: ContainerTrackingSnapshot | null;
  docsState: ShipmentDocumentsLoadState;
  copy: (typeof dashboardCopy)[PortalLocale];
  locale: PortalLocale;
  onLoadDocs: () => void;
  onReloadDocs: () => void;
  onClose: () => void;
}) {
  const metaRows: [string, string][] = [
    [copy.etdLabel, formatDate(shipment.etd, locale)],
    [copy.etaLabel, formatDate(shipment.eta, locale)],
  ];

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="rounded-3xl border border-black/8 bg-[#fffaf1] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/8 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyl-ink/55">
              EMB {shipment.id} · {shipment.season}
            </p>
            <p className="mt-1 text-base font-semibold text-cyl-ink">
              {shipment.vesselName} · {shipment.container}
            </p>
            <p className="mt-0.5 text-sm text-cyl-ink/60">
              {shipment.originPort} → {shipment.destinationPort} ·{" "}
              {shipment.shippingLine}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-cyl-ink transition hover:bg-slate-50"
          >
            <CloseIcon />
            {copy.close}
          </button>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {/* Tracking + metadata */}
          <div className="space-y-4">
            <TrackingTimeline
              shipment={shipment}
              tracking={tracking}
              copy={copy}
              locale={locale}
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {metaRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-black/6 bg-white/80 px-3 py-2"
                >
                  <p className="font-semibold text-cyl-ink/55">{label}</p>
                  <p className="mt-0.5 text-cyl-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Document center */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-cyl-ink/70">
                <FileIcon />
                <p className="text-xs font-bold uppercase tracking-[0.18em]">
                  {copy.docsCenter}
                </p>
              </div>
              <button
                type="button"
                onClick={
                  docsState.status === "idle" ? onLoadDocs : onReloadDocs
                }
                disabled={docsState.status === "loading"}
                className={`dashboard-loading-button inline-flex items-center gap-1.5 rounded-full bg-[#059669] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-slate-400 ${
                  docsState.status === "loading" ? "is-busy" : ""
                }`}
              >
                {docsState.status === "loading" ? (
                  <SpinnerIcon className="h-3.5 w-3.5" />
                ) : (
                  <DownloadIcon />
                )}
                {docsState.status === "loading"
                  ? copy.loadingDocs
                  : docsState.status === "loaded" ||
                      docsState.status === "error"
                    ? copy.reloadDocs
                    : copy.loadDocs}
              </button>
            </div>
            <p className="mt-1 text-xs text-cyl-ink/50">{copy.docsHint}</p>

            {docsState.status === "loaded" && docsState.courier ? (
              <ShipmentCourierCard
                courier={docsState.courier}
                copy={copy}
                locale={locale}
              />
            ) : null}

            <ShipmentDocumentsGrid
              copy={copy}
              locale={locale}
              state={docsState}
              onRetry={onReloadDocs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function ClientHomeDashboard({
  locale,
  rows: initialRows,
  trackingSnapshots,
  vesselTrackingSnapshots,
  seasons: initialSeasons,
  defaultSeason,
  errorMessage,
  trackingErrorMessage,
}: ClientHomeDashboardProps) {
  const copy = dashboardCopy[locale];

  const [rows, setRows] = useState<EmbarqueRow[]>(initialRows);
  const [selectedSeason, setSelectedSeason] = useState<string>(
    defaultSeason ?? initialSeasons[0]?.code ?? "",
  );
  const [statusFilter, setStatusFilter] =
    useState<ShipmentStatusFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [etdFrom, setEtdFrom] = useState("");
  const [etaFrom, setEtaFrom] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [shipmentDocsByKey, setShipmentDocsByKey] = useState<
    Record<string, ShipmentDocumentsLoadState>
  >({});
  const [mapSelectedKey, setMapSelectedKey] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // ── Scroll to row after page/expand state settles ─────────────────────────
  const pendingScrollToKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = pendingScrollToKeyRef.current;
    if (!key) return;
    const rowEl = document.getElementById(`row-${key}`);
    if (rowEl) {
      pendingScrollToKeyRef.current = null;
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentPage, expandedKey]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const allShipments = useMemo(() => buildShipmentsFromRows(rows), [rows]);
  const selectedSeasonFilterValues = useMemo(
    () => buildSeasonFilterValues(selectedSeason, initialSeasons),
    [initialSeasons, selectedSeason],
  );
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const isSearchSettling =
    searchQuery.trim().toLowerCase() !== normalizedSearchQuery;
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    searchField !== "all" ||
    statusFilter ||
    etdFrom ||
    etaFrom,
  );
  const shipmentsBeforeStatusFilter = useMemo(() => {
    return allShipments.filter((shipment) => {
      return (
        matchesSeasonFilter(shipment, selectedSeasonFilterValues) &&
        matchesSearchField(shipment, normalizedSearchQuery, searchField) &&
        matchesDateRange(shipment.etd, etdFrom, "") &&
        matchesDateRange(shipment.eta, etaFrom, "")
      );
    });
  }, [
    allShipments,
    normalizedSearchQuery,
    searchField,
    selectedSeasonFilterValues,
    etdFrom,
    etaFrom,
  ]);
  const filteredShipments = useMemo(() => {
    if (!statusFilter) {
      return shipmentsBeforeStatusFilter;
    }

    return shipmentsBeforeStatusFilter.filter(
      (shipment) => shipment.status === statusFilter,
    );
  }, [shipmentsBeforeStatusFilter, statusFilter]);
  const filteredShipmentKeys = useMemo(
    () => new Set(filteredShipments.map((shipment) => shipment.groupKey)),
    [filteredShipments],
  );
  const mapEligibleShipments = useMemo(
    () =>
      filteredShipments.filter((shipment) =>
        shouldRenderShipmentInMap(shipment),
      ),
    [filteredShipments],
  );
  const mapEligibleShipmentKeys = useMemo(
    () => new Set(mapEligibleShipments.map((shipment) => shipment.groupKey)),
    [mapEligibleShipments],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredShipments.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const pagedShipments = useMemo(
    () =>
      filteredShipments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredShipments, safePage],
  );

  // ── Summary counts ────────────────────────────────────────────────────────
  const { inTransitCount, arrivingSoonCount, docsReadyCount } = useMemo(() => {
    return {
      inTransitCount: shipmentsBeforeStatusFilter.filter(
        (shipment) => shipment.status === "En transito",
      ).length,
      arrivingSoonCount: shipmentsBeforeStatusFilter.filter(
        (shipment) => shipment.status === "Programado",
      ).length,
      docsReadyCount: shipmentsBeforeStatusFilter.filter(
        (shipment) => shipment.status === "Arribado",
      ).length,
    };
  }, [shipmentsBeforeStatusFilter]);

  // ── Tracking lookup ───────────────────────────────────────────────────────
  const trackingByContainer = useMemo(
    () =>
      new Map(
        trackingSnapshots.map((snapshot) => [
          normalizeContainerKey(snapshot.containerNumber),
          snapshot,
        ]),
      ),
    [trackingSnapshots],
  );
  const trackingByVessel = useMemo(
    () =>
      new Map(
        vesselTrackingSnapshots.map((snapshot) => [
          normalizeVesselKey(snapshot.vesselName),
          snapshot,
        ]),
      ),
    [vesselTrackingSnapshots],
  );

  const getTracking = useCallback(
    (shipment: ShipmentSummary): ContainerTrackingSnapshot | null => {
      return (
        trackingByContainer.get(normalizeContainerKey(shipment.container)) ??
        trackingByVessel.get(normalizeVesselKey(shipment.vesselName)) ??
        null
      );
    },
    [trackingByContainer, trackingByVessel],
  );

  // ── Tracked items for map ─────────────────────────────────────────────────
  const trackedItems = useMemo<TrackedShipmentItem[]>(() => {
    return mapEligibleShipments.reduce<TrackedShipmentItem[]>(
      (acc, shipment) => {
        const byContainer = trackingByContainer.get(
          normalizeContainerKey(shipment.container),
        );

        if (byContainer) {
          acc.push({
            shipment,
            tracking: byContainer,
            trackingMatchScope: "container",
          });
          return acc;
        }

        const byVessel = trackingByVessel.get(
          normalizeVesselKey(shipment.vesselName),
        );

        if (byVessel) {
          acc.push({
            shipment,
            tracking: byVessel,
            trackingMatchScope: "vessel",
          });
        }

        return acc;
      },
      [],
    );
  }, [mapEligibleShipments, trackingByContainer, trackingByVessel]);
  const selectedMapShipment = useMemo(() => {
    if (!mapSelectedKey) {
      return null;
    }

    return (
      mapEligibleShipments.find(
        (shipment) => shipment.groupKey === mapSelectedKey,
      ) ?? null
    );
  }, [mapEligibleShipments, mapSelectedKey]);
  const selectedMapTracking = useMemo(() => {
    if (!selectedMapShipment) {
      return null;
    }

    return getTracking(selectedMapShipment);
  }, [getTracking, selectedMapShipment]);
  const handleMapSelection = useCallback((shipmentKey: string) => {
    setMapSelectedKey((previousKey) =>
      previousKey === shipmentKey ? null : shipmentKey,
    );
  }, []);
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSearchField("all");
    setStatusFilter(null);
    setEtdFrom("");
    setEtaFrom("");
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((status: ShipmentStatusFilter) => {
    setStatusFilter((currentStatus) =>
      currentStatus === status ? null : status,
    );
    setCurrentPage(1);
    setExpandedKey(null);
  }, []);

  useEffect(() => {
    const shouldClearMapSelection =
      mapSelectedKey && !mapEligibleShipmentKeys.has(mapSelectedKey);
    const shouldClearExpandedRow =
      expandedKey && !filteredShipmentKeys.has(expandedKey);

    if (!shouldClearMapSelection && !shouldClearExpandedRow) {
      return;
    }

    queueMicrotask(() => {
      if (shouldClearMapSelection) {
        setMapSelectedKey(null);
      }

      if (shouldClearExpandedRow) {
        setExpandedKey(null);
      }
    });
  }, [
    expandedKey,
    filteredShipmentKeys,
    mapEligibleShipmentKeys,
    mapSelectedKey,
  ]);

  // ── Season change ─────────────────────────────────────────────────────────
  async function handleSeasonChange(season: string) {
    if (season === selectedSeason || isLoadingSeason) return;
    setSelectedSeason(season);
    setCurrentPage(1);
    setExpandedKey(null);
    setSearchQuery("");
    setSearchField("all");
    setStatusFilter(null);
    setEtdFrom("");
    setEtaFrom("");
    setIsLoadingSeason(true);

    try {
      const response = await fetch(
        `/api/embarques?season=${encodeURIComponent(season)}`,
        { method: "GET", cache: "no-store" },
      );

      if (response.ok) {
        const data = (await response.json()) as { rows?: EmbarqueRow[] };

        if (Array.isArray(data.rows)) {
          setRows(data.rows);
        }
      }
    } catch {
      // keep existing rows on error
    } finally {
      setIsLoadingSeason(false);
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  function goToPage(page: number) {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
    setExpandedKey(null);
  }

  // ── Documents ─────────────────────────────────────────────────────────────
  async function loadDocs(shipment: ShipmentSummary, force = false) {
    const currentState = shipmentDocsByKey[shipment.groupKey];

    if (
      !force &&
      (currentState?.status === "loading" || currentState?.status === "loaded")
    ) {
      return;
    }

    setShipmentDocsByKey((prev) => ({
      ...prev,
      [shipment.groupKey]: {
        status: "loading",
        items: prev[shipment.groupKey]?.items ?? [],
        unavailableTypes:
          prev[shipment.groupKey]?.unavailableTypes ??
          EMPTY_DOCS_STATE.unavailableTypes,
        summary: prev[shipment.groupKey]?.summary ?? EMPTY_DOCS_STATE.summary,
        courier: prev[shipment.groupKey]?.courier ?? EMPTY_DOCS_STATE.courier,
        errorMessage: null,
      },
    }));

    try {
      const response = await fetch(
        `/api/embarques/${encodeURIComponent(shipment.id)}/documentos?temporada=${encodeURIComponent(shipment.season)}`,
        { method: "GET", cache: "no-store" },
      );
      const data = (await response.json()) as ShipmentDocumentsResponse;

      if (!response.ok) {
        throw new Error(data.message?.trim() || copy.docsLoadFailed);
      }

      setShipmentDocsByKey((prev) => ({
        ...prev,
        [shipment.groupKey]: {
          status: "loaded",
          items: Array.isArray(data.items) ? data.items : [],
          unavailableTypes: Array.isArray(data.unavailableTypes)
            ? data.unavailableTypes
            : [],
          summary: {
            totalDocuments: data.summary?.totalDocuments ?? 0,
            availableFiles: data.summary?.availableFiles ?? 0,
            unavailableFiles: data.summary?.unavailableFiles ?? 0,
          },
          courier: data.courier ?? null,
          errorMessage: null,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : copy.docsLoadFailed;

      setShipmentDocsByKey((prev) => ({
        ...prev,
        [shipment.groupKey]: {
          status: "error",
          items: prev[shipment.groupKey]?.items ?? [],
          unavailableTypes:
            prev[shipment.groupKey]?.unavailableTypes ??
            EMPTY_DOCS_STATE.unavailableTypes,
          summary: prev[shipment.groupKey]?.summary ?? EMPTY_DOCS_STATE.summary,
          courier: prev[shipment.groupKey]?.courier ?? EMPTY_DOCS_STATE.courier,
          errorMessage: message,
        },
      }));
    }
  }

  // ── Row toggle ────────────────────────────────────────────────────────────
  function toggleRow(shipment: ShipmentSummary) {
    if (expandedKey === shipment.groupKey) {
      setExpandedKey(null);
      return;
    }

    setExpandedKey(shipment.groupKey);
    void loadDocs(shipment);
  }

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div
          role="alert"
          className="dashboard-enter rounded-[1.4rem] border border-amber-200 bg-amber-50/95 px-5 py-4 text-sm text-amber-950 shadow-[0_14px_32px_rgba(146,64,14,0.08)]"
        >
          <p className="font-bold">{copy.operationalErrorTitle}</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </div>
      ) : null}

      {trackingErrorMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="dashboard-enter rounded-[1.4rem] border border-sky-200 bg-sky-50/95 px-5 py-4 text-sm text-sky-950 shadow-[0_14px_32px_rgba(14,116,144,0.08)]"
        >
          <p className="font-bold">{copy.trackingWarningTitle}</p>
          <p className="mt-1 leading-6">{trackingErrorMessage}</p>
        </div>
      ) : null}

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="dashboard-enter grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label={copy.arrivingSoon}
          count={arrivingSoonCount}
          subtitle={copy.arrivingSoonSub}
          accentClass="text-amber-600"
          ariaLabel={copy.summaryFilterLabel(
            copy.arrivingSoon,
            arrivingSoonCount,
            copy.arrivingSoonSub,
          )}
          isActive={statusFilter === "Programado"}
          onClick={() => handleStatusFilterChange("Programado")}
        />
        <SummaryCard
          label={copy.inTransit}
          count={inTransitCount}
          subtitle={copy.inTransitSub}
          accentClass="text-sky-600"
          ariaLabel={copy.summaryFilterLabel(
            copy.inTransit,
            inTransitCount,
            copy.inTransitSub,
          )}
          isActive={statusFilter === "En transito"}
          onClick={() => handleStatusFilterChange("En transito")}
        />
        <SummaryCard
          label={copy.docsReady}
          count={docsReadyCount}
          subtitle={copy.docsReadySub}
          accentClass="text-emerald-600"
          ariaLabel={copy.summaryFilterLabel(
            copy.docsReady,
            docsReadyCount,
            copy.docsReadySub,
          )}
          isActive={statusFilter === "Arribado"}
          onClick={() => handleStatusFilterChange("Arribado")}
        />
      </div>

      {/* ── Búsqueda y filtros ─────────────────────────────────────────────── */}
      <div
        role="search"
        aria-label={copy.filtersRegionLabel}
        aria-busy={isLoadingSeason || isSearchSettling}
        className={`dashboard-enter dashboard-enter-delay-1 dashboard-live-region rounded-3xl border border-black/8 bg-white/88 px-4 py-4 text-cyl-ink shadow-[0_18px_44px_rgba(17,11,2,0.12)] backdrop-blur-sm sm:px-5 lg:border-white/10 lg:bg-white/6 lg:text-white lg:shadow-[0_16px_40px_rgba(0,0,0,0.12)] ${
          isLoadingSeason || isSearchSettling ? "is-busy" : ""
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.6fr)_220px_220px_auto_auto] xl:items-end">
          <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <label htmlFor="shipment-search" className="sr-only">
              {copy.searchLabel}
            </label>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyl-ink/40 lg:text-white/50">
              {isSearchSettling ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : (
                <SearchIcon />
              )}
            </span>
            <input
              id="shipment-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={copy.searchPlaceholder}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 pl-9 pr-4 text-sm text-cyl-ink placeholder:text-cyl-ink/42 backdrop-blur-sm transition focus:border-cyl-gold/80 focus:bg-white focus:outline-none lg:border-white/14 lg:bg-white/10 lg:text-white lg:placeholder:text-white/45 lg:focus:border-white/30 lg:focus:bg-white/14"
            />
          </div>

          <div className="relative">
            <label htmlFor="shipment-search-field" className="sr-only">
              {copy.searchFieldLabel}
            </label>
            <select
              id="shipment-search-field"
              value={searchField}
              onChange={(e) => {
                setSearchField(e.target.value as SearchField);
                setCurrentPage(1);
              }}
              className="h-11 w-full appearance-none rounded-2xl border border-black/10 bg-white/80 pl-4 pr-9 text-sm font-medium text-cyl-ink backdrop-blur-sm transition focus:border-cyl-gold/80 focus:bg-white focus:outline-none lg:border-white/14 lg:bg-white/10 lg:text-white lg:focus:border-white/30 lg:focus:bg-white/14"
            >
              <option value="all" className="bg-[#1d1d1d] text-white">
                {copy.searchByLabel}: {copy.searchByAll}
              </option>
              <option value="container" className="bg-[#1d1d1d] text-white">
                {copy.searchByLabel}: {copy.searchByContainer}
              </option>
              <option value="shipment" className="bg-[#1d1d1d] text-white">
                {copy.searchByLabel}: {copy.searchByShipment}
              </option>
              <option value="booking" className="bg-[#1d1d1d] text-white">
                {copy.searchByLabel}: {copy.searchByBooking}
              </option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cyl-ink/40 lg:text-white/50">
              <ChevronDownIcon />
            </span>
          </div>

          <div className="relative">
            <label htmlFor="shipment-season" className="sr-only">
              {copy.seasonSelectLabel}
            </label>
            <select
              id="shipment-season"
              value={selectedSeason}
              onChange={(e) => void handleSeasonChange(e.target.value)}
              disabled={isLoadingSeason}
              className="h-11 w-full appearance-none rounded-2xl border border-black/10 bg-white/80 pl-4 pr-9 text-sm font-medium text-cyl-ink backdrop-blur-sm transition focus:border-cyl-gold/80 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 lg:border-white/14 lg:bg-white/10 lg:text-white lg:focus:border-white/30 lg:focus:bg-white/14"
            >
              {initialSeasons.length > 0 ? (
                initialSeasons.map((season) => (
                  <option
                    key={season.code}
                    value={season.code}
                    className="bg-[#1d1d1d] text-white"
                  >
                    {copy.seasonLabel}: {season.description}
                  </option>
                ))
              ) : (
                <option
                  value={selectedSeason}
                  className="bg-[#1d1d1d] text-white"
                >
                  {copy.seasonLabel}: {selectedSeason}
                </option>
              )}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cyl-ink/40 lg:text-white/50">
              <ChevronDownIcon />
            </span>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters || isLoadingSeason}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 text-sm font-semibold text-cyl-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 lg:border-white/14 lg:bg-white/10 lg:text-white lg:hover:bg-white/16"
          >
            <CloseIcon />
            {copy.clearFilters}
          </button>

          <button
            type="button"
            onClick={() => downloadShipmentsAsCsv(filteredShipments, locale)}
            disabled={
              filteredShipments.length === 0 ||
              isLoadingSeason ||
              isSearchSettling
            }
            className={`dashboard-loading-button inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#059669] px-4 text-sm font-semibold text-white transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40 ${
              isLoadingSeason || isSearchSettling ? "is-busy" : ""
            }`}
          >
            {isLoadingSeason || isSearchSettling ? (
              <SpinnerIcon className="h-4 w-4" />
            ) : (
              <DownloadIcon />
            )}
            {copy.exportExcel}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyl-ink/55 lg:text-white/58">
              {copy.etdFromLabel}
            </span>
            <input
              type="date"
              value={etdFrom}
              onChange={(e) => {
                setEtdFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 px-4 text-sm text-cyl-ink backdrop-blur-sm transition [color-scheme:light] focus:border-cyl-gold/80 focus:bg-white focus:outline-none lg:border-white/14 lg:bg-white/10 lg:text-white lg:[color-scheme:dark] lg:focus:border-white/30 lg:focus:bg-white/14"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyl-ink/55 lg:text-white/58">
              {copy.etaFromLabel}
            </span>
            <input
              type="date"
              value={etaFrom}
              onChange={(e) => {
                setEtaFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 px-4 text-sm text-cyl-ink backdrop-blur-sm transition [color-scheme:light] focus:border-cyl-gold/80 focus:bg-white focus:outline-none lg:border-white/14 lg:bg-white/10 lg:text-white lg:[color-scheme:dark] lg:focus:border-white/30 lg:focus:bg-white/14"
            />
          </label>
        </div>

        <p
          aria-live="polite"
          className={`mt-3 text-xs text-cyl-ink/55 transition-opacity duration-200 lg:text-white/55 ${
            isSearchSettling ? "opacity-80" : "opacity-100"
          }`}
        >
          {isLoadingSeason
            ? copy.loadingNewSeason
            : isSearchSettling
              ? copy.searchingResults
              : `${filteredShipments.length} ${copy.shipmentsShowing}${
                  searchQuery.trim() ? ` · "${searchQuery.trim()}"` : ""
                }`}
        </p>
      </div>

      <div id="tracking" aria-hidden="true" className="relative -top-28" />

      {/* ── Mapa de seguimiento ────────────────────────────────────────────── */}
      {trackedItems.length > 0 ? (
        <section
          aria-labelledby="tracking-map-heading"
          aria-busy={isSearchSettling}
          className={`dashboard-enter dashboard-enter-delay-2 dashboard-live-region ${
            isSearchSettling ? "is-busy" : ""
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="tracking-map-heading"
              className="text-lg font-semibold text-white"
            >
              {copy.trackingTitle}
            </h2>
            <span className="text-xs text-white/55">
              {trackedItems.length}{" "}
              {locale === "es"
                ? "contenedor(es) con posición en tiempo real"
                : "container(s) with live position"}
            </span>
          </div>
          <p id="tracking-map-description" className="sr-only">
            {copy.trackingMapDescription} {trackedItems.length}{" "}
            {locale === "es" ? "embarques disponibles." : "available shipments."}
          </p>
          <div
            aria-describedby="tracking-map-description"
            className="overflow-hidden rounded-3xl shadow-[0_20px_48px_rgba(0,0,0,0.22)]"
            style={{ height: "420px" }}
          >
            <TrackingMap
              items={trackedItems}
              locale={locale}
              ariaLabel={copy.trackingMapDescription}
              selectedShipmentId={mapSelectedKey}
              onSelectShipment={handleMapSelection}
            />
          </div>

          {/* Panel de info del embarque seleccionado en el mapa */}
          {selectedMapShipment ? (
            <div className="mt-3 rounded-[1.4rem] border border-white/14 bg-white/10 px-5 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-sm">
              {(() => {
                const selectedMapProgress = normalizeTrackingProgress(
                  selectedMapTracking?.progressPercentage,
                  selectedMapShipment.status === "Arribado",
                );

                return (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={shipmentStatusBadge(
                          selectedMapShipment.status,
                        )}
                      >
                        {statusLabel(selectedMapShipment.status, locale)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {selectedMapShipment.container}
                          {selectedMapShipment.bl !== "Sin BL" ? (
                            <span className="ml-2 font-normal text-white/65">
                              BL {selectedMapShipment.bl}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-white/60">
                          {selectedMapShipment.vesselName} ·{" "}
                          {selectedMapShipment.originPort} →{" "}
                          {selectedMapShipment.destinationPort}
                        </p>
                      </div>
                    </div>

                      <div className="flex items-center gap-2">
                        <div className="flex gap-4 text-xs text-white/70">
                        <span>
                          <span className="text-white/45">
                            {copy.etdLabel}:{" "}
                          </span>
                          {formatDate(selectedMapShipment.etd, locale)}
                        </span>
                        <span>
                          <span className="text-white/45">
                            {copy.etaLabel}:{" "}
                          </span>
                          {formatDate(selectedMapShipment.eta, locale)}
                        </span>
                        {selectedMapProgress !== null ? (
                          <span>
                            <span className="text-white/45">
                              {copy.trackingProgress}:{" "}
                            </span>
                            {Math.round(selectedMapProgress)}%
                          </span>
                        ) : null}
                        </div>
                        <button
                          type="button"
                        onClick={() => {
                          const idx = filteredShipments.findIndex(
                            (shipment) =>
                              shipment.groupKey ===
                              selectedMapShipment.groupKey,
                          );
                          if (idx < 0) return;
                          const page = Math.ceil((idx + 1) / PAGE_SIZE);
                          void loadDocs(selectedMapShipment);
                          pendingScrollToKeyRef.current =
                            selectedMapShipment.groupKey;
                          setCurrentPage(page);
                          setExpandedKey(selectedMapShipment.groupKey);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#059669] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#047857]"
                      >
                        <ChevronDownIcon />
                        {copy.showInTable}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapSelectedKey(null)}
                        aria-label={copy.clearMapSelection}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/16"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </section>
      ) : null}

      <div id="documentos" aria-hidden="true" className="relative -top-28" />

      {/* ── Tabla de embarques ─────────────────────────────────────────────── */}
      <section
        id="embarques"
        aria-labelledby="shipments-table-heading"
        aria-busy={isSearchSettling}
        className={`dashboard-enter dashboard-enter-delay-3 dashboard-live-region ${
          isSearchSettling ? "is-busy" : ""
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="shipments-table-heading"
            className="text-2xl font-semibold text-white"
          >
            {copy.misEmbarques}
          </h2>
          {totalPages > 1 ? (
            <span className="text-sm text-white/60">
              {copy.pageOf(safePage, totalPages)}
            </span>
          ) : null}
        </div>

        {filteredShipments.length === 0 ? (
          <div className="rounded-3xl border border-black/8 bg-white p-10 text-center shadow-[0_20px_40px_rgba(13,13,13,0.10)]">
            <p className="text-lg font-semibold text-cyl-ink">
              {copy.noShipmentsTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-cyl-ink/65">
              {copy.noShipmentsDescription}
            </p>
          </div>
        ) : (
          <>
            <div className="table-shell">
              <table className="min-w-full text-sm">
                <caption className="sr-only">
                  {filteredShipments.length} {copy.shipmentsShowing}.{" "}
                  {copy.misEmbarques}
                </caption>
                <thead>
                  <tr className="border-b border-black/8">
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.15em] text-cyl-ink/55"
                    >
                      {copy.colStatus}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-cyl-ink/55"
                    >
                      {copy.colContainer}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-cyl-ink/55 sm:table-cell"
                    >
                      {copy.colRoute}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-cyl-ink/55 md:table-cell"
                    >
                      {copy.colDates}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.15em] text-cyl-ink/55"
                    >
                      {copy.colActions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedShipments.map((shipment) => {
                    const isExpanded = expandedKey === shipment.groupKey;
                    const docsState =
                      shipmentDocsByKey[shipment.groupKey] ?? EMPTY_DOCS_STATE;
                    const tracking = getTracking(shipment);

                    const isMapSelected = mapSelectedKey === shipment.groupKey;
                    return (
                      <Fragment key={shipment.groupKey}>
                        <tr
                          id={`row-${shipment.groupKey}`}
                          className={`border-b border-black/6 transition-colors last:border-0 ${
                            isExpanded
                              ? "bg-[#fffbf2]"
                              : isMapSelected
                                ? "bg-sky-50 outline-2 outline-sky-300"
                                : "even:bg-black/[0.018] hover:bg-[#fffbee]"
                          }`}
                        >
                          <td className="px-4 py-3.5 text-center align-middle">
                            <p className="font-semibold text-cyl-ink">
                              {shipment.id}
                            </p>
                            <div className="mt-1">
                              <span
                                className={shipmentStatusBadge(shipment.status)}
                              >
                                {statusLabel(shipment.status, locale)}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 align-middle">
                            <p className="font-semibold text-cyl-ink">
                              {shipment.container}
                            </p>
                            <p className="mt-0.5 text-xs text-cyl-ink/55">
                              {copy.bookingLabel} {shipment.booking}
                            </p>
                          </td>

                          <td className="hidden px-4 py-3.5 align-middle sm:table-cell">
                            <p className="font-medium text-cyl-ink">
                              {shipment.vesselName}
                            </p>
                            <p className="mt-0.5 text-xs text-cyl-ink/55">
                              {shipment.originPort} → {shipment.destinationPort}
                            </p>
                          </td>

                          <td className="hidden px-4 py-3.5 align-middle md:table-cell">
                            <p className="font-medium text-cyl-ink">
                              {formatDate(shipment.etd, locale)}
                            </p>
                            <p className="mt-0.5 text-xs text-cyl-ink/55">
                              ETA {formatDate(shipment.eta, locale)}
                            </p>
                          </td>

                          <td className="px-4 py-3.5 text-right align-middle">
                            <button
                              type="button"
                              onClick={() => toggleRow(shipment)}
                              aria-expanded={isExpanded}
                              aria-controls={`details-${shipment.groupKey}`}
                              aria-label={copy.toggleDetailsFor(shipment.id)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                                isExpanded
                                  ? "bg-[#111827] text-white hover:bg-[#1f2937]"
                                  : "border border-black/10 bg-white text-cyl-ink hover:bg-slate-50"
                              }`}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUpIcon />
                                  {copy.hideDetails}
                                </>
                              ) : (
                                <>
                                  <ChevronDownIcon />
                                  {copy.viewDetails}
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded ? (
                          <tr
                            id={`details-${shipment.groupKey}`}
                            className="docs-expansion"
                          >
                            <td colSpan={5} className="p-0">
                              <ShipmentExpandedRow
                                shipment={shipment}
                                tracking={tracking}
                                docsState={docsState}
                                copy={copy}
                                locale={locale}
                                onLoadDocs={() => void loadDocs(shipment)}
                                onReloadDocs={() =>
                                  void loadDocs(shipment, true)
                                }
                                onClose={() => setExpandedKey(null)}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeftIcon />
                  {copy.prev}
                </button>
                <span className="min-w-28 text-center text-sm font-medium text-white/75">
                  {copy.pageOf(safePage, totalPages)}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copy.next}
                  <ChevronRightIcon />
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
