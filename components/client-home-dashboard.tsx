"use client";

import dynamic from "next/dynamic";
import { Fragment, useState, type ReactNode } from "react";
import {
  buildShipmentsFromRows,
  type ContainerTrackingSnapshot,
  formatDate,
  formatNumber,
  formatWeight,
  type EmbarqueRow,
  type ShipmentSummary,
  type TrackedShipmentItem,
} from "@/lib/portal-data";

type FilterState = {
  species: string;
  destination: string;
  season: string;
};

type PortalLocale = "es" | "en";

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
  items?: ShipmentDocumentItem[];
  message?: string;
};

type ShipmentDocumentsLoadState = {
  status: "idle" | "loading" | "loaded" | "error";
  items: ShipmentDocumentItem[];
  errorMessage: string | null;
};

const EMPTY_SHIPMENT_DOCUMENTS_STATE: ShipmentDocumentsLoadState = {
  status: "idle",
  items: [],
  errorMessage: null,
};

const dashboardCopy = {
  es: {
    allSpecies: "Todas las especies",
    allDestinations: "Todos los destinos",
    allSeasons: "Todas las temporadas",
    filterSpecies: "Especie",
    filterDestination: "Destino",
    filterSeason: "Temporada",
    apply: "Aplicar",
    clear: "Limpiar",
    exportCsv: "CSV",
    filteredBase: "Base total filtrada",
    totalShippedWeight: "Peso total embarcado",
    totalShareSuffix: "del total",
    generalView: "Vista general cliente sin filtros adicionales.",
    trackingKicker: "Tracking maritimo",
    trackingHeading: "Seguimiento de mi fruta",
    trackingDescription:
      "Ubicacion aproximada de las naves que hoy siguen activas para el cliente, usando el mismo lenguaje operativo del portal de C&L.",
    trackingActiveSuffix: "con tracking activo",
    visibleShipmentsSuffix: "embarques visibles",
    vesselApproximation:
      "embarques visibles usan posicion aproximada por nave cuando el contenedor no trae snapshot activo directo.",
    noTrackingForView: "Sin tracking activo para esta vista",
    adjustFiltersForTracking:
      "Ajusta los filtros para volver a cargar embarques.",
    noLiveTrackingAvailable:
      "Los embarques visibles no tienen un tracking vigente por contenedor ni una nave activa asociada en ContainerTrackingDaily.",
    noTripsTitle: "No hay viajes para ese cruce",
    noTripsDescription:
      "Prueba limpiando los filtros o cambiando la combinacion para volver a ver los embarques disponibles.",
    noLivePositionTitle: "Sin posicion activa para los contenedores visibles",
    noLivePositionDescription:
      "Los embarques visibles siguen apareciendo en la tabla, pero no tienen un tracking vigente por contenedor ni por nave en ContainerTrackingDaily para el mapa.",
    mapInstruction:
      "Haz clic en una posicion del mapa para ver el detalle del embarque, la ultima ubicacion reportada y su ETA estimada sin desplegar una lista larga de viajes.",
    approximateByVessel: "Posicion aproximada por nave",
    inTransit: "En transito",
    lastPosition: "Ultima posicion",
    etaSourceShipment: "Base embarque",
    etaSourceCarrier: "Fuente transportista",
    vesselContainer: "Nave / contenedor",
    estimatedProgress: "Avance estimado",
    noData: "Sin dato",
    trackingResolvedByVessel: "tracking resuelto por nave",
    remaining: "restantes",
    viewDocuments: "Ver documentos",
    clearSelection: "Limpiar seleccion",
    selectTrackedShipmentTitle: "Selecciona una nave o contenedor",
    selectTrackedShipmentDescription:
      "Presiona una posicion del mapa para abrir un resumen puntual del embarque, sin listar toda la cartera visible en esta seccion.",
    shipmentsWithoutTracking:
      "embarques visibles no tienen un tracking vigente por contenedor ni por nave en ContainerTrackingDaily.",
    detailsKicker: "Detalle operativo",
    consolidatedShipments: "Embarques consolidados",
    consolidatedDescription:
      "Vista agrupada desde `vw_Embarques_pc` para mostrar solo el embarque y sus datos operativos, sin repetir el detalle por pallet.",
    consolidatedSuffix: "embarques consolidados",
    shipmentDocuments: "Documentos del embarque",
    documentsLiveHint:
      "Los archivos se consultan en vivo desde la API segura por embarque y temporada.",
    readyToSail: "Por zarpar",
    downloadDocs: "Descargar docs",
    loadDocuments: "Cargar docs",
    reloadDocuments: "Recargar docs",
    loadingDocuments: "Cargando documentos...",
    documentsLoadFailed:
      "No fue posible cargar los documentos de este embarque.",
    noDocumentsAvailable:
      "No hay archivos disponibles para este embarque en la API segura.",
    openDocument: "Ver archivo",
    secureApi: "API segura",
    documentType: "Tipo",
    documentUpdatedAt: "Actualizado",
    fileSize: "Tamano",
    retry: "Reintentar",
    close: "Cerrar",
    tripDates: "Fechas del viaje",
    commercialData: "Datos comerciales",
    useViewDocs:
      "Usa el boton Ver docs dentro de la tabla para abrir los documentos del embarque seleccionado.",
    noShipmentsTitle: "Sin embarques en la tabla",
    noShipmentsDescription:
      "No existen embarques para el cruce actual. Ajusta filtros o vuelve a la vista general para seguir trabajando.",
    tableShipment: "Embarque",
    tableReceiver: "Recibidor",
    tableSpeciesVariety: "Especie / Variedad",
    tableVesselContainer: "Nave / Contenedor",
    tableEtdEta: "ETD / ETA",
    tableAtdAta: "ATD / ATA",
    tableTotals: "Totales",
    tableDocuments: "Documentos",
    toDestination: "Hacia",
    growers: "productores",
    totalBoxes: "cajas totales",
    pallets: "pallets",
    bookingAwb: "Booking / AWB",
    docsShort: "docs",
    viewDocs: "Ver docs",
    download: "Descargar",
    manifestShipment: "Embarque",
    manifestReceiver: "Recibidor",
    manifestConsignee: "Consignatario",
    manifestRoute: "Ruta",
    manifestVessel: "Nave",
    manifestShippingLine: "Naviera",
    manifestContainer: "Contenedor",
    manifestTotalBoxes: "Total cajas",
    manifestNetWeight: "Peso neto",
    manifestStatus: "Estado",
    manifestDocuments: "Documentos",
    csvFilePrefix: "embarques-clientes",
    manifestFilePrefix: "embarque",
    manifestFileSuffix: "documentos",
  },
  en: {
    allSpecies: "All species",
    allDestinations: "All destinations",
    allSeasons: "All seasons",
    filterSpecies: "Species",
    filterDestination: "Destination",
    filterSeason: "Season",
    apply: "Apply",
    clear: "Clear",
    exportCsv: "CSV",
    filteredBase: "Filtered total base",
    totalShippedWeight: "Total shipped weight",
    totalShareSuffix: "of total",
    generalView: "Client overview with no extra filters.",
    trackingKicker: "Ocean tracking",
    trackingHeading: "Tracking for my fruit",
    trackingDescription:
      "Approximate location of vessels that are still active for this client, using the same operational language as the C&L portal.",
    trackingActiveSuffix: "with live tracking",
    visibleShipmentsSuffix: "visible shipments",
    vesselApproximation:
      "visible shipments use approximate vessel position when the container has no active direct snapshot.",
    noTrackingForView: "No active tracking for this view",
    adjustFiltersForTracking: "Adjust the filters to load shipments again.",
    noLiveTrackingAvailable:
      "Visible shipments do not have current tracking by container or an active linked vessel in ContainerTrackingDaily.",
    noTripsTitle: "No voyages for this filter combination",
    noTripsDescription:
      "Try clearing filters or changing the combination to see available shipments again.",
    noLivePositionTitle: "No live position for visible containers",
    noLivePositionDescription:
      "Visible shipments still appear in the table, but they do not have current container or vessel tracking in ContainerTrackingDaily for the map.",
    mapInstruction:
      "Click a point on the map to see shipment details, the latest reported location, and the estimated ETA without opening a long voyage list.",
    approximateByVessel: "Approximate position by vessel",
    inTransit: "In transit",
    lastPosition: "Latest position",
    etaSourceShipment: "Shipment base",
    etaSourceCarrier: "Carrier source",
    vesselContainer: "Vessel / container",
    estimatedProgress: "Estimated progress",
    noData: "No data",
    trackingResolvedByVessel: "tracking resolved by vessel",
    remaining: "remaining",
    viewDocuments: "View documents",
    clearSelection: "Clear selection",
    selectTrackedShipmentTitle: "Select a vessel or container",
    selectTrackedShipmentDescription:
      "Click a position on the map to open a focused shipment summary without listing the entire visible portfolio in this section.",
    shipmentsWithoutTracking:
      "visible shipments do not have current container or vessel tracking in ContainerTrackingDaily.",
    detailsKicker: "Operational detail",
    consolidatedShipments: "Consolidated shipments",
    consolidatedDescription:
      "Grouped view from `vw_Embarques_pc` to show only the shipment and its operational data without repeating pallet-level detail.",
    consolidatedSuffix: "consolidated shipments",
    shipmentDocuments: "Shipment documents",
    documentsLiveHint: "",
    readyToSail: "Ready to sail",
    downloadDocs: "Download docs",
    loadDocuments: "Load docs",
    reloadDocuments: "Reload docs",
    loadingDocuments: "Loading documents...",
    documentsLoadFailed: "The shipment documents could not be loaded.",
    noDocumentsAvailable:
      "No files are available for this shipment in the secure API.",
    openDocument: "Open file",
    secureApi: "Actions",
    documentType: "Type",
    documentUpdatedAt: "Updated",
    fileSize: "File size",
    retry: "Retry",
    close: "Close",
    tripDates: "Voyage dates",
    commercialData: "Commercial data",
    useViewDocs:
      "Use the View docs button inside the table to open the documents for the selected shipment.",
    noShipmentsTitle: "No shipments in the table",
    noShipmentsDescription:
      "There are no shipments for the current filter combination. Adjust filters or return to the full view to keep working.",
    tableShipment: "Shipment",
    tableReceiver: "Receiver",
    tableSpeciesVariety: "Species / Variety",
    tableVesselContainer: "Vessel / Container",
    tableEtdEta: "ETD / ETA",
    tableAtdAta: "ATD / ATA",
    tableTotals: "Totals",
    tableDocuments: "Documents",
    toDestination: "To",
    growers: "growers",
    totalBoxes: "total boxes",
    pallets: "pallets",
    bookingAwb: "Booking / AWB",
    docsShort: "docs",
    viewDocs: "View docs",
    download: "Download",
    manifestShipment: "Shipment",
    manifestReceiver: "Receiver",
    manifestConsignee: "Consignee",
    manifestRoute: "Route",
    manifestVessel: "Vessel",
    manifestShippingLine: "Shipping line",
    manifestContainer: "Container",
    manifestTotalBoxes: "Total boxes",
    manifestNetWeight: "Net weight",
    manifestStatus: "Status",
    manifestDocuments: "Documents",
    csvFilePrefix: "client-shipments",
    manifestFilePrefix: "shipment",
    manifestFileSuffix: "documents",
  },
} as const;

function getDecimalFormatter(locale: PortalLocale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function translateShipmentStatus(
  status: ShipmentSummary["status"],
  locale: PortalLocale,
  variant: "badge" | "raw" = "raw",
) {
  if (locale === "es") {
    if (status === "Programado" && variant === "badge") {
      return dashboardCopy.es.readyToSail;
    }

    return status;
  }

  switch (status) {
    case "Programado":
      return variant === "badge" ? dashboardCopy.en.readyToSail : "Scheduled";
    case "En transito":
      return "In transit";
    default:
      return "Arrived";
  }
}

function translateDocumentState(state: string, locale: PortalLocale) {
  const normalizedState = state.trim().toUpperCase();

  if (normalizedState === "") {
    return dashboardCopy[locale].noData;
  }

  if (locale === "es") {
    switch (normalizedState) {
      case "LOADED":
        return "Cargado";
      default:
        return state;
    }
  }

  switch (normalizedState) {
    case "Emitido":
    case "EMITIDO":
      return "Issued";
    case "Confirmado":
    case "CONFIRMADO":
      return "Confirmed";
    case "Completo":
    case "COMPLETO":
      return "Complete";
    case "Vigente":
    case "VIGENTE":
      return "Current";
    case "Parcial":
    case "PARCIAL":
      return "Partial";
    case "Pendiente":
    case "PENDIENTE":
      return "Pending";
    case "CARGADO":
      return "Uploaded";
    case "DISPONIBLE":
      return "Available";
    case "NO_DISPONIBLE":
      return "Unavailable";
    default:
      return state;
  }
}

const TrackingMap = dynamic(
  () =>
    import("@/components/tracking-map").then((module) => module.TrackingMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-90 items-center justify-center bg-[#d7e1e6] px-6 text-center text-sm font-semibold text-cyl-ink/70">
        Loading map...
      </div>
    ),
  },
);

type ClientHomeDashboardProps = {
  locale: PortalLocale;
  rows: EmbarqueRow[];
  trackingSnapshots: ContainerTrackingSnapshot[];
  vesselTrackingSnapshots: ContainerTrackingSnapshot[];
  errorMessage?: string | null;
  trackingErrorMessage?: string | null;
};

export function ClientHomeDashboard({
  locale,
  rows,
  trackingSnapshots,
  vesselTrackingSnapshots,
  errorMessage,
  trackingErrorMessage,
}: ClientHomeDashboardProps) {
  const copy = dashboardCopy[locale];
  const filterMeta = buildFilterMeta(rows, locale);
  const formatWholeNumber = (value: number | null | undefined) =>
    formatNumber(value, locale);
  const formatLocalizedWeight = (value: number | null | undefined) =>
    formatWeight(value, locale);
  const formatLocalizedDate = (value: string | null | undefined) =>
    formatDate(value, locale);
  const [draftFilters, setDraftFilters] = useState<FilterState>(
    filterMeta.defaultFilters,
  );
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(
    filterMeta.defaultFilters,
  );
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [selectedTrackedShipmentId, setSelectedTrackedShipmentId] = useState<
    string | null
  >(null);
  const [shipmentDocumentsByKey, setShipmentDocumentsByKey] = useState<
    Record<string, ShipmentDocumentsLoadState>
  >({});

  const filteredRows = rows.filter((row) =>
    matchesRowWithFilters(row, appliedFilters, filterMeta.defaultFilters),
  );
  const filteredShipments = buildShipmentsFromRows(filteredRows);
  const trackingByContainer = new Map(
    trackingSnapshots.map((snapshot) => [
      normalizeContainerKey(snapshot.containerNumber),
      snapshot,
    ]),
  );
  const trackingByVessel = new Map(
    vesselTrackingSnapshots.map((snapshot) => [
      normalizeVesselKey(snapshot.vesselName),
      snapshot,
    ]),
  );
  const trackedShipments = filteredShipments.reduce<TrackedShipmentItem[]>(
    (items, shipment) => {
      const containerTrackingSnapshot = trackingByContainer.get(
        normalizeContainerKey(shipment.container),
      );

      if (containerTrackingSnapshot) {
        items.push({
          shipment,
          tracking: containerTrackingSnapshot,
          trackingMatchScope: "container",
        });

        return items;
      }

      const vesselTrackingSnapshot = trackingByVessel.get(
        normalizeVesselKey(shipment.vesselName),
      );

      if (vesselTrackingSnapshot) {
        items.push({
          shipment,
          tracking: vesselTrackingSnapshot,
          trackingMatchScope: "vessel",
        });
      }

      return items;
    },
    [],
  );
  const trackedShipmentById = new Map(
    trackedShipments.map((item) => [item.shipment.groupKey, item]),
  );
  const shipmentById = new Map(
    filteredShipments.map((shipment) => [shipment.groupKey, shipment]),
  );
  const totalShipments = filteredShipments.length;
  const shipmentsWithoutTracking = totalShipments - trackedShipments.length;
  const shipmentsTrackedByVessel = trackedShipments.filter(
    (item) => item.trackingMatchScope === "vessel",
  ).length;
  const totalWeight = filteredShipments.reduce(
    (accumulator, shipment) => accumulator + shipment.netWeight,
    0,
  );
  const totalBoxes = filteredShipments.reduce(
    (accumulator, shipment) => accumulator + shipment.totalBoxes,
    0,
  );
  const pendingShipments = filteredShipments.filter(
    (shipment) => shipment.status === "Programado",
  ).length;
  const transitShipments = filteredShipments.filter(
    (shipment) => shipment.status === "En transito",
  ).length;
  const arrivedShipments = filteredShipments.filter(
    (shipment) => shipment.status === "Arribado",
  ).length;
  const activeFilters = countActiveFilters(
    appliedFilters,
    filterMeta.defaultFilters,
  );
  const selectedTrackedShipment = selectedTrackedShipmentId
    ? (trackedShipmentById.get(selectedTrackedShipmentId) ?? null)
    : null;
  const selectedTrackedShipmentEtaValue = selectedTrackedShipment
    ? (selectedTrackedShipment.shipment.eta ??
      selectedTrackedShipment.tracking.etaReference)
    : null;
  const selectedTrackedShipmentEtaSource = selectedTrackedShipment
    ? selectedTrackedShipment.shipment.eta
      ? copy.etaSourceShipment
      : (selectedTrackedShipment.tracking.etaReferenceType ??
        copy.etaSourceCarrier)
    : copy.etaSourceCarrier;

  async function loadShipmentDocuments(
    shipment: ShipmentSummary,
    forceRefresh = false,
  ) {
    setShipmentDocumentsByKey((current) => {
      const previous =
        current[shipment.groupKey] ?? EMPTY_SHIPMENT_DOCUMENTS_STATE;

      return {
        ...current,
        [shipment.groupKey]: {
          status: "loading",
          items: previous.items,
          errorMessage: null,
        },
      };
    });

    try {
      const response = await fetch(
        `/api/embarques/${encodeURIComponent(shipment.id)}/documentos?temporada=${encodeURIComponent(shipment.season)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: forceRefresh
            ? {
                "cache-control": "no-store",
                pragma: "no-cache",
              }
            : undefined,
        },
      );
      const payload = (await response.json()) as ShipmentDocumentsResponse;
      const items = Array.isArray(payload.items) ? payload.items : null;

      if (!response.ok || !items) {
        throw new Error(payload.message?.trim() || copy.documentsLoadFailed);
      }

      setShipmentDocumentsByKey((current) => ({
        ...current,
        [shipment.groupKey]: {
          status: "loaded",
          items,
          errorMessage: null,
        },
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : copy.documentsLoadFailed;

      setShipmentDocumentsByKey((current) => {
        const previous =
          current[shipment.groupKey] ?? EMPTY_SHIPMENT_DOCUMENTS_STATE;

        return {
          ...current,
          [shipment.groupKey]: {
            status: "error",
            items: previous.items,
            errorMessage,
          },
        };
      });
    }
  }

  function openShipmentDocuments(
    shipment: ShipmentSummary,
    forceRefresh = false,
  ) {
    setSelectedShipmentId(shipment.groupKey);

    const currentState = shipmentDocumentsByKey[shipment.groupKey];

    if (
      forceRefresh ||
      !currentState ||
      currentState.status === "error" ||
      currentState.status === "idle"
    ) {
      void loadShipmentDocuments(shipment, forceRefresh);
    }
  }

  const metricCards = [
    {
      label: locale === "en" ? "Shipments" : "Embarques",
      value: formatWholeNumber(totalShipments),
      note: copy.filteredBase,
      accentClass: "text-[#f97316]",
      iconClass: "bg-[#fff0e6] text-[#f97316]",
      icon: <CalendarIcon />,
    },
    {
      label: locale === "en" ? "Weight" : "Kilos",
      value: formatWholeNumber(totalWeight),
      note: copy.totalShippedWeight,
      accentClass: "text-[#16a34a]",
      iconClass: "bg-[#e6fbef] text-[#16a34a]",
      icon: <BoxIcon />,
    },
    {
      label: copy.readyToSail,
      value: formatWholeNumber(pendingShipments),
      note: `${formatPercent(pendingShipments, totalShipments, locale)} ${copy.totalShareSuffix}`,
      accentClass: "text-[#f59e0b]",
      iconClass: "bg-[#fff6de] text-[#f59e0b]",
      icon: <ClockIcon />,
      progress: percentage(pendingShipments, totalShipments),
      progressClass: "bg-[#f59e0b]",
    },
    {
      label: copy.inTransit,
      value: formatWholeNumber(transitShipments),
      note: `${formatPercent(transitShipments, totalShipments, locale)} ${copy.totalShareSuffix}`,
      accentClass: "text-[#0ea5e9]",
      iconClass: "bg-[#eaf7ff] text-[#0ea5e9]",
      icon: <BoltIcon />,
      progress: percentage(transitShipments, totalShipments),
      progressClass: "bg-[#0ea5e9]",
    },
    {
      label: locale === "en" ? "Arrived" : "Arribados",
      value: formatWholeNumber(arrivedShipments),
      note: `${formatPercent(arrivedShipments, totalShipments, locale)} ${copy.totalShareSuffix}`,
      accentClass: "text-[#10b981]",
      iconClass: "bg-[#e7fbf2] text-[#10b981]",
      icon: <CheckCircleIcon />,
      progress: percentage(arrivedShipments, totalShipments),
      progressClass: "bg-[#10b981]",
    },
  ];

  return (
    <>
      {errorMessage ? (
        <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50/95 px-5 py-4 text-sm text-amber-900 shadow-[0_14px_32px_rgba(146,64,14,0.08)]">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-6">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.14)] backdrop-blur-sm lg:p-5">
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
            <FilterSelect
              label={copy.filterSpecies}
              value={draftFilters.species}
              options={filterMeta.speciesOptions}
              icon={<FilterIcon />}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, species: value }))
              }
            />
            <FilterSelect
              label={copy.filterDestination}
              value={draftFilters.destination}
              options={filterMeta.destinationOptions}
              icon={<ShipWheelIcon />}
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  destination: value,
                }))
              }
            />
            <FilterSelect
              label={copy.filterSeason}
              value={draftFilters.season}
              options={filterMeta.seasonOptions}
              icon={<SeasonIcon />}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, season: value }))
              }
            />

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => {
                  setAppliedFilters(draftFilters);
                  setSelectedShipmentId(null);
                  setSelectedTrackedShipmentId(null);
                }}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/16">
                  <SparkleIcon />
                </span>
                {copy.apply}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(filterMeta.defaultFilters);
                  setAppliedFilters(filterMeta.defaultFilters);
                  setSelectedShipmentId(null);
                  setSelectedTrackedShipmentId(null);
                }}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#e5e7eb] px-4 text-sm font-semibold text-slate-700 transition hover:bg-[#d1d5db]"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/5">
                  <CloseIcon />
                </span>
                {copy.clear}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadShipmentsAsCsv(filteredShipments, locale)
                }
                disabled={filteredShipments.length === 0}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#059669] px-4 text-sm font-semibold text-white transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/14">
                  <DownloadIcon />
                </span>
                {copy.exportCsv}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-white/72">
            <p>
              {locale === "en"
                ? `Showing ${formatWholeNumber(totalShipments)} shipments, ${formatWholeNumber(totalBoxes)} boxes and ${formatLocalizedWeight(totalWeight)}.`
                : `Mostrando ${formatWholeNumber(totalShipments)} embarques, ${formatWholeNumber(totalBoxes)} cajas y ${formatLocalizedWeight(totalWeight)}.`}
            </p>
            <p>
              {activeFilters > 0
                ? locale === "en"
                  ? `${formatWholeNumber(activeFilters)} active filters applied to this view.`
                  : `${formatWholeNumber(activeFilters)} filtros activos sobre la vista.`
                : copy.generalView}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          {metricCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.6rem] border border-black/8 bg-white p-5 shadow-[0_24px_48px_rgba(13,13,13,0.14)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-sm font-semibold uppercase tracking-widest ${card.accentClass}`}
                  >
                    {card.label}
                  </p>
                </div>
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-[0.95rem] ${card.iconClass}`}
                >
                  {card.icon}
                </span>
              </div>

              <p className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-[#0f172a]">
                {card.value}
              </p>
              <p className="mt-3 text-sm text-slate-500">{card.note}</p>

              {card.progress !== undefined ? (
                <div className="mt-5 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${card.progressClass}`}
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section
        id="tracking"
        className="panel overflow-hidden p-5 sm:p-6 lg:p-7"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[#fff4df] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#ce7f1a]">
              {copy.trackingKicker}
            </span>
            <h2 className="mt-4 text-3xl font-semibold text-cyl-ink">
              {copy.trackingHeading}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-cyl-ink/72">
              {copy.trackingDescription}
            </p>
          </div>

          <div className="rounded-full border border-black/8 bg-[#fff9ef] px-4 py-2 text-sm font-semibold text-cyl-ink">
            {trackedShipments.length > 0
              ? `${formatWholeNumber(trackedShipments.length)} ${copy.trackingActiveSuffix}`
              : `${formatWholeNumber(totalShipments)} ${copy.visibleShipmentsSuffix}`}
          </div>
        </div>

        {shipmentsTrackedByVessel > 0 ? (
          <div className="mt-4 rounded-[1.2rem] border border-black/8 bg-[#f6f9ff] px-4 py-3 text-sm text-cyl-ink/72 shadow-[0_12px_24px_rgba(37,99,235,0.08)]">
            {formatWholeNumber(shipmentsTrackedByVessel)}{" "}
            {copy.vesselApproximation}
          </div>
        ) : null}

        {trackingErrorMessage ? (
          <div className="mt-5 rounded-[1.3rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-[0_12px_24px_rgba(146,64,14,0.08)]">
            {trackingErrorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="relative min-h-90 overflow-hidden rounded-[1.85rem] border border-black/8 bg-[#d7e1e6] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            {trackedShipments.length === 0 ? (
              <div className="flex h-full min-h-90 items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.85),transparent_26%),radial-gradient(circle_at_76%_22%,rgba(255,255,255,0.8),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(175,190,198,0.34))] px-6 text-center">
                <div className="max-w-md">
                  <p className="text-lg font-semibold text-cyl-ink">
                    {copy.noTrackingForView}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
                    {filteredShipments.length === 0
                      ? copy.adjustFiltersForTracking
                      : copy.noLiveTrackingAvailable}
                  </p>
                </div>
              </div>
            ) : (
              <TrackingMap
                items={trackedShipments}
                selectedShipmentId={selectedTrackedShipmentId}
                onSelectShipment={setSelectedTrackedShipmentId}
              />
            )}
          </div>

          <div className="space-y-3">
            {filteredShipments.length === 0 ? (
              <EmptyState
                title={copy.noTripsTitle}
                description={copy.noTripsDescription}
              />
            ) : trackedShipments.length === 0 ? (
              <EmptyState
                title={copy.noLivePositionTitle}
                description={copy.noLivePositionDescription}
              />
            ) : (
              <>
                <div className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-3 text-sm text-cyl-ink/72 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                  {copy.mapInstruction}
                </div>

                {selectedTrackedShipment ? (
                  <article className="rounded-[1.45rem] border border-black/8 bg-[#fffaf1] p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyl-ink/55">
                          EMB {selectedTrackedShipment.shipment.id}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-cyl-ink">
                          {selectedTrackedShipment.shipment.recipientName}
                        </h3>
                        {selectedTrackedShipment.trackingMatchScope ===
                        "vessel" ? (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                            {copy.approximateByVessel}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={shipmentStatusBadge(
                          selectedTrackedShipment.shipment.status,
                        )}
                      >
                        {selectedTrackedShipment.tracking.statusCode ===
                        "IN_TRANSIT"
                          ? copy.inTransit
                          : selectedTrackedShipment.tracking.statusLabel}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-cyl-ink/70">
                      {selectedTrackedShipment.shipment.route}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-black/8 bg-white/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                          {copy.lastPosition}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-cyl-ink">
                          {selectedTrackedShipment.tracking
                            .lastEventLocationName ??
                            selectedTrackedShipment.tracking.destinationName}
                        </p>
                        <p className="mt-1 text-xs text-cyl-ink/55">
                          {formatTrackingDateValue(
                            selectedTrackedShipment.tracking.lastEventDate ??
                              selectedTrackedShipment.tracking.trackedAt,
                            locale,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-black/8 bg-white/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                          ETA
                        </p>
                        <p className="mt-2 text-sm font-semibold text-cyl-ink">
                          {formatTrackingDateValue(
                            selectedTrackedShipmentEtaValue,
                            locale,
                          )}
                        </p>
                        <p className="mt-1 text-xs text-cyl-ink/55">
                          {selectedTrackedShipmentEtaSource}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-black/8 bg-white/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                          {copy.vesselContainer}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-cyl-ink">
                          {selectedTrackedShipment.tracking.vesselName}
                        </p>
                        <p className="mt-1 text-xs text-cyl-ink/55">
                          {selectedTrackedShipment.shipment.container}
                          {selectedTrackedShipment.trackingMatchScope ===
                          "vessel"
                            ? ` · ${copy.trackingResolvedByVessel}`
                            : ""}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-black/8 bg-white/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                          {copy.estimatedProgress}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-cyl-ink">
                          {formatProgress(
                            selectedTrackedShipment.tracking.progressPercentage,
                            locale,
                          )}
                        </p>
                        <p className="mt-1 text-xs text-cyl-ink/55">
                          {formatDistance(
                            selectedTrackedShipment.tracking
                              .remainingDistanceKm,
                            locale,
                          )}{" "}
                          {copy.remaining}
                        </p>
                      </div>
                    </div>

                    {selectedTrackedShipment.tracking.progressPercentage !==
                    null ? (
                      <div className="mt-4">
                        <div className="h-2 rounded-full bg-[#e6edf5]">
                          <div
                            className="h-2 rounded-full bg-[#2563eb]"
                            style={{
                              width: `${selectedTrackedShipment.tracking.progressPercentage <= 0 ? 0 : Math.min(100, Math.max(selectedTrackedShipment.tracking.progressPercentage, 6))}%`,
                            }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs font-medium text-cyl-ink/55">
                          <span>
                            {selectedTrackedShipment.tracking.originName}
                          </span>
                          <span>
                            {selectedTrackedShipment.tracking.destinationName}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3 border-t border-black/8 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const documentsAnchorId =
                            buildShipmentDocumentsAnchorId(
                              selectedTrackedShipment.shipment.groupKey,
                            );

                          openShipmentDocuments(
                            selectedTrackedShipment.shipment,
                          );
                          window.requestAnimationFrame(() => {
                            document
                              .getElementById(documentsAnchorId)
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "nearest",
                              });
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                      >
                        <EyeIcon />
                        {copy.viewDocuments}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTrackedShipmentId(null)}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cyl-ink transition hover:bg-slate-50"
                      >
                        <CloseIcon />
                        {copy.clearSelection}
                      </button>
                    </div>
                  </article>
                ) : (
                  <EmptyState
                    title={copy.selectTrackedShipmentTitle}
                    description={copy.selectTrackedShipmentDescription}
                  />
                )}
              </>
            )}

            {shipmentsWithoutTracking > 0 ? (
              <div className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-3 text-sm text-cyl-ink/72 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                {formatWholeNumber(shipmentsWithoutTracking)}{" "}
                {copy.shipmentsWithoutTracking}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section id="embarques" className="panel p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker text-cyl-gold">{copy.detailsKicker}</p>
            <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
              {copy.consolidatedShipments}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-cyl-ink/72">
              {copy.consolidatedDescription}
            </p>
          </div>

          <div className="rounded-full border border-cyl-gold/30 bg-[#fff9ef] px-4 py-2 text-sm font-semibold text-cyl-ink">
            {formatWholeNumber(totalShipments)} {copy.consolidatedSuffix}
          </div>
        </div>
        <div id="documentos" className="h-0" />

        {filteredShipments.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={copy.noShipmentsTitle}
              description={copy.noShipmentsDescription}
            />
          </div>
        ) : (
          <div className="table-shell mt-6 overflow-x-auto">
            <table className="min-w-330">
              <thead>
                <tr>
                  <th>{copy.tableShipment}</th>
                  <th>{copy.tableReceiver}</th>
                  <th>{copy.tableSpeciesVariety}</th>
                  <th>{copy.tableVesselContainer}</th>
                  <th>{copy.tableEtdEta}</th>
                  <th>{copy.tableAtdAta}</th>
                  <th>{copy.tableTotals}</th>
                  <th>BL</th>
                  <th>{copy.tableDocuments}</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => {
                  const isSelected = shipment.groupKey === selectedShipmentId;
                  const shipmentDocumentsState =
                    shipmentDocumentsByKey[shipment.groupKey] ??
                    EMPTY_SHIPMENT_DOCUMENTS_STATE;

                  return (
                    <Fragment key={shipment.groupKey}>
                      <tr className={isSelected ? "is-selected" : undefined}>
                        <td>
                          <div className="flex items-start justify-between gap-3">
                            <div className="inline-flex min-w-12 items-center justify-center rounded-2xl bg-[#111827] px-3 py-2 text-base font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
                              {shipment.id}
                            </div>
                            <span
                              className={shipmentStatusBadge(shipment.status)}
                            >
                              {translateShipmentStatus(shipment.status, locale)}
                            </span>
                          </div>
                          <div className="mt-3 text-sm font-semibold text-cyl-ink/82">
                            {shipment.originPort}
                          </div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/42">
                            {copy.toDestination} {shipment.destinationPort}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold leading-6 text-cyl-ink">
                            {shipment.recipientName}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#f8f1df] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyl-ink/64">
                              {shipment.recipientCode}
                            </span>
                            <span className="rounded-full bg-[#f4f4f5] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyl-ink/56">
                              {shipment.recipientGroup}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-cyl-ink/60">
                            {shipment.market}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold leading-6 text-cyl-ink">
                            {shipment.species.join(" · ")}
                          </div>
                          <div className="mt-1 text-sm text-cyl-ink/60">
                            {shipment.varieties.join(" · ")}
                          </div>
                          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyl-ink/38">
                            {formatWholeNumber(shipment.producers.length)}{" "}
                            {copy.growers}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold leading-6 text-cyl-ink">
                            {shipment.vesselName}
                          </div>
                          <div className="mt-1 text-sm text-cyl-ink/60">
                            {shipment.container}
                          </div>
                          <div className="mt-3 inline-flex rounded-full bg-[#eef6fb] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#0f5f78]">
                            {shipment.shippingLine}
                          </div>
                        </td>
                        <td>
                          <div className="space-y-2">
                            <div className="rounded-2xl border border-black/6 bg-[#fff8ea] px-3 py-2">
                              <div className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-cyl-ink/42">
                                ETD
                              </div>
                              <div className="mt-1 text-sm font-semibold text-cyl-ink">
                                {formatLocalizedDate(shipment.etd)}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-black/6 bg-[#f6f9fd] px-3 py-2">
                              <div className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-cyl-ink/42">
                                ETA
                              </div>
                              <div className="mt-1 text-sm font-semibold text-cyl-ink">
                                {formatLocalizedDate(shipment.eta)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-2">
                            <div className="rounded-2xl border border-black/6 bg-[#eef9f2] px-3 py-2">
                              <div className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-cyl-ink/42">
                                ATD
                              </div>
                              <div className="mt-1 text-sm font-semibold text-cyl-ink">
                                {formatLocalizedDate(shipment.atd)}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-black/6 bg-[#f8f7fb] px-3 py-2">
                              <div className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-cyl-ink/42">
                                ATA
                              </div>
                              <div className="mt-1 text-sm font-semibold text-cyl-ink">
                                {formatLocalizedDate(shipment.ata)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-lg font-semibold tracking-[-0.03em] text-cyl-ink">
                            {formatWholeNumber(shipment.totalBoxes)}
                          </div>
                          <div className="text-sm text-cyl-ink/58">
                            {copy.totalBoxes}
                          </div>
                          <div className="mt-3 text-sm font-semibold text-cyl-ink">
                            {formatLocalizedWeight(shipment.netWeight)}
                          </div>
                          <div className="text-sm text-cyl-ink/58">
                            {formatWholeNumber(shipment.pallets)} {copy.pallets}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold leading-6 text-cyl-ink">
                            {shipment.bl}
                          </div>
                          <div className="mt-1 text-sm text-cyl-ink/60">
                            {shipment.booking}
                          </div>
                          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyl-ink/38">
                            {copy.bookingAwb}
                          </div>
                        </td>
                        <td>
                          <div className="min-w-44 rounded-[1.2rem] border border-black/8 bg-white/80 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyl-ink/42">
                              {shipmentDocumentsState.status === "loaded"
                                ? `${formatWholeNumber(shipmentDocumentsState.items.length)} ${copy.docsShort}`
                                : copy.secureApi}
                            </div>
                            <div className="mt-3 flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => openShipmentDocuments(shipment)}
                                className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                                  isSelected
                                    ? "bg-[#111827] text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)]"
                                    : "border border-black/10 bg-white text-cyl-ink hover:bg-slate-50"
                                }`}
                              >
                                <EyeIcon />
                                {copy.viewDocs}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openShipmentDocuments(
                                    shipment,
                                    shipmentDocumentsState.status === "loaded",
                                  )
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#047857]"
                              >
                                <DownloadIcon />
                                {shipmentDocumentsState.status === "loaded" ||
                                shipmentDocumentsState.status === "error"
                                  ? copy.reloadDocuments
                                  : copy.loadDocuments}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {isSelected ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="bg-transparent px-4 pb-4 pt-0"
                          >
                            <InlineShipmentDocumentsPanel
                              anchorId={buildShipmentDocumentsAnchorId(
                                shipment.groupKey,
                              )}
                              copy={copy}
                              locale={locale}
                              shipment={shipment}
                              state={shipmentDocumentsState}
                              onClose={() => setSelectedShipmentId(null)}
                              onReload={() =>
                                void loadShipmentDocuments(shipment, true)
                              }
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
        )}
      </section>
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  icon,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  icon: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-[1.35rem] border border-black/8 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cyl-ink/50">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[#f8f3e8] text-cyl-ink">
          {icon}
        </span>
        <div className="relative min-w-0 flex-1">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full appearance-none bg-transparent pr-8 text-sm font-semibold text-cyl-ink outline-none"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-cyl-ink/45">
            <ChevronDownIcon />
          </span>
        </div>
      </div>
    </label>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-black/12 bg-[#fffdf8] p-6 text-center">
      <p className="text-lg font-semibold text-cyl-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-cyl-ink/68">{description}</p>
    </div>
  );
}

function buildShipmentDocumentsAnchorId(groupKey: string) {
  return `documentos-${groupKey.replaceAll("|", "-")}`;
}

function InlineShipmentDocumentsPanel({
  anchorId,
  copy,
  locale,
  shipment,
  state,
  onClose,
  onReload,
}: {
  anchorId: string;
  copy: (typeof dashboardCopy)[PortalLocale];
  locale: PortalLocale;
  shipment: ShipmentSummary;
  state: ShipmentDocumentsLoadState;
  onClose: () => void;
  onReload: () => void;
}) {
  return (
    <div
      id={anchorId}
      className="rounded-[1.6rem] border border-black/8 bg-[#fffaf1] p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="section-kicker text-cyl-gold">
              {copy.shipmentDocuments}
            </p>
            <span className="rounded-full bg-[#111827] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyl-gold">
              EMB {shipment.id}
            </span>
            <span className={shipmentStatusBadge(shipment.status)}>
              {translateShipmentStatus(shipment.status, locale, "badge")}
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-cyl-ink">
            {shipment.recipientName}
          </h3>
          <p className="mt-1 text-sm leading-6 text-cyl-ink/70">
            {shipment.vesselName} · {shipment.container} · {shipment.route}
          </p>
          <p className="mt-2 text-sm text-cyl-ink/58">
            {copy.documentsLiveHint}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReload}
            disabled={state.status === "loading"}
            className="inline-flex items-center gap-2 rounded-full bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
          >
            <DownloadIcon />
            {state.status === "loaded" || state.status === "error"
              ? copy.reloadDocuments
              : copy.loadDocuments}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cyl-ink transition hover:bg-slate-50"
          >
            <CloseIcon />
            {copy.close}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
            {copy.tripDates}
          </p>
          <p className="mt-2 text-sm text-cyl-ink">
            ETD {formatDate(shipment.etd, locale)} · ETA{" "}
            {formatDate(shipment.eta, locale)}
          </p>
          <p className="mt-1 text-sm text-cyl-ink/70">
            ATD {formatDate(shipment.atd, locale)} · ATA{" "}
            {formatDate(shipment.ata, locale)}
          </p>
        </div>
        <div className="rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
            {copy.commercialData}
          </p>
          <p className="mt-2 text-sm text-cyl-ink">
            BL {shipment.bl} · Booking {shipment.booking}
          </p>
          <p className="mt-1 text-sm text-cyl-ink/70">
            {shipment.shippingLine} · {shipment.market}
          </p>
        </div>
      </div>

      <ShipmentDocumentsGrid
        copy={copy}
        locale={locale}
        state={state}
        onRetry={onReload}
      />
    </div>
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
      <div className="mt-5 rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-4 text-sm font-medium text-cyl-ink/68">
        {copy.loadingDocuments}
      </div>
    );
  }

  if (state.status === "error" && state.items.length === 0) {
    return (
      <div className="mt-5 rounded-[1.15rem] border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-900 shadow-[0_12px_24px_rgba(146,64,14,0.08)]">
        <p>{state.errorMessage ?? copy.documentsLoadFailed}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
        >
          <SparkleIcon />
          {copy.retry}
        </button>
      </div>
    );
  }

  if (state.status === "loaded" && state.items.length === 0) {
    return (
      <div className="mt-5 rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-4 text-sm text-cyl-ink/68">
        {copy.noDocumentsAvailable}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {state.status === "loading" ? (
        <div className="rounded-[1.05rem] border border-black/8 bg-[#eef6fb] px-4 py-3 text-sm text-cyl-ink/72">
          {copy.loadingDocuments}
        </div>
      ) : null}

      {state.status === "error" && state.errorMessage ? (
        <div className="rounded-[1.05rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          {state.errorMessage}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {state.items.map((document) => (
          <div
            key={document.id}
            className="rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-cyl-ink">
                  {document.type}
                </p>
                <p className="mt-1 break-all text-sm text-cyl-ink/65">
                  {document.originalName ?? copy.noData}
                </p>
              </div>
              <span className={documentStateBadge(document.status)}>
                {translateDocumentState(document.status, locale)}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-cyl-ink/58 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-cyl-ink/72">
                  {copy.documentType}:
                </span>{" "}
                {document.type}
              </p>
              <p>
                <span className="font-semibold text-cyl-ink/72">
                  {copy.fileSize}:
                </span>{" "}
                {formatFileSize(document.size, locale)}
              </p>
              <p className="sm:col-span-2">
                <span className="font-semibold text-cyl-ink/72">
                  {copy.documentUpdatedAt}:
                </span>{" "}
                {formatTrackingDateValue(document.updatedAt, locale)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={document.viewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-cyl-ink transition hover:bg-slate-50 text-black"
              >
                <EyeIcon />
                {copy.openDocument}
              </a>
              <a
                href={document.downloadUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#047857]"
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

function buildFilterMeta(rows: EmbarqueRow[], locale: PortalLocale) {
  const copy = dashboardCopy[locale];
  const speciesOptions = [
    copy.allSpecies,
    ...collectUniqueOptions(rows.map((row) => row.NomEspecie)),
  ];
  const destinationOptions = [
    copy.allDestinations,
    ...collectUniqueOptions(rows.map((row) => row.NomPuertoDestino)),
  ];
  const seasonValues = collectUniqueOptions(
    rows.map((row) => row.CodigoTemporada),
  );

  return {
    speciesOptions,
    destinationOptions,
    seasonOptions: [copy.allSeasons, ...seasonValues],
    defaultFilters: {
      species: copy.allSpecies,
      destination: copy.allDestinations,
      season: seasonValues[0] ?? copy.allSeasons,
    } satisfies FilterState,
  };
}

function matchesRowWithFilters(
  row: EmbarqueRow,
  filters: FilterState,
  defaultFilters: FilterState,
) {
  const matchesSpecies =
    filters.species === defaultFilters.species ||
    row.NomEspecie === filters.species;
  const matchesDestination =
    filters.destination === defaultFilters.destination ||
    row.NomPuertoDestino === filters.destination;
  const matchesSeason =
    filters.season === defaultFilters.season ||
    row.CodigoTemporada === filters.season;

  return matchesSpecies && matchesDestination && matchesSeason;
}

function collectUniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is string => Boolean(value && value.trim())),
    ),
  );
}

function percentage(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return (value / total) * 100;
}

function formatPercent(value: number, total: number, locale: PortalLocale) {
  if (total === 0) {
    return locale === "en" ? "0.0%" : "0,0%";
  }

  return `${getDecimalFormatter(locale).format((value / total) * 100)}%`;
}

function countActiveFilters(filters: FilterState, defaultFilters: FilterState) {
  return [
    filters.species !== defaultFilters.species,
    filters.destination !== defaultFilters.destination,
    filters.season !== defaultFilters.season,
  ].filter(Boolean).length;
}

function normalizeContainerKey(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function normalizeVesselKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function formatTrackingDateValue(
  value: string | null | undefined,
  locale: PortalLocale,
) {
  if (!value) {
    return dashboardCopy[locale].noData;
  }

  const dateMatch = value.match(/\d{4}-\d{2}-\d{2}/);

  if (dateMatch) {
    return formatDate(dateMatch[0], locale);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return formatDate(parsedDate.toISOString().slice(0, 10), locale);
}

function formatProgress(
  value: number | null | undefined,
  locale: PortalLocale,
) {
  if (value == null) {
    return dashboardCopy[locale].noData;
  }

  return `${getDecimalFormatter(locale).format(value)}%`;
}

function formatDistance(
  value: number | null | undefined,
  locale: PortalLocale,
) {
  if (value == null) {
    return dashboardCopy[locale].noData;
  }

  return `${formatNumber(value, locale)} km`;
}

function downloadShipmentsAsCsv(
  shipments: ShipmentSummary[],
  locale: PortalLocale,
) {
  const copy = dashboardCopy[locale];
  const headers = [
    copy.manifestShipment,
    locale === "en" ? "Season" : "Temporada",
    copy.manifestReceiver,
    locale === "en" ? "Group" : "Grupo",
    copy.manifestConsignee,
    locale === "en" ? "OriginPort" : "PuertoOrigen",
    locale === "en" ? "DestinationPort" : "PuertoDestino",
    locale === "en" ? "Country" : "Pais",
    locale === "en" ? "Species" : "Especie",
    locale === "en" ? "Variety" : "Variedad",
    copy.manifestVessel,
    copy.manifestShippingLine,
    copy.manifestContainer,
    locale === "en" ? "Boxes" : "Cajas",
    locale === "en" ? "NetWeight" : "PesoNeto",
    "ETD",
    "ETA",
    "ATD",
    "ATA",
    "BL",
    locale === "en" ? "Booking" : "Booking",
  ];

  const lines = shipments.map((shipment) =>
    [
      shipment.id,
      shipment.season,
      shipment.recipientName,
      shipment.recipientGroup,
      shipment.consignee,
      shipment.originPort,
      shipment.destinationPort,
      shipment.country,
      shipment.species.join(" | "),
      shipment.varieties.join(" | "),
      shipment.vesselName,
      shipment.shippingLine,
      shipment.container,
      shipment.totalBoxes,
      shipment.netWeight,
      shipment.etd,
      shipment.eta,
      shipment.atd,
      shipment.ata,
      shipment.bl,
      shipment.booking,
    ]
      .map(escapeCsvValue)
      .join(";"),
  );

  const csvContent = `\uFEFF${headers.join(";")}\n${lines.join("\n")}`;
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `${copy.csvFilePrefix}-${date}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);

  if (/[";\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

function shipmentStatusBadge(status: ShipmentSummary["status"]) {
  switch (status) {
    case "Arribado":
      return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700";
    case "En transito":
      return "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700";
    default:
      return "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700";
  }
}

function documentStateBadge(state: string) {
  switch (state.trim().toUpperCase()) {
    case "Emitido":
    case "EMITIDO":
    case "Confirmado":
    case "CONFIRMADO":
    case "Completo":
    case "COMPLETO":
    case "Vigente":
    case "VIGENTE":
    case "CARGADO":
    case "DISPONIBLE":
      return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700";
    case "Parcial":
    case "PARCIAL":
      return "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700";
    default:
      return "rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700";
  }
}

function formatFileSize(
  value: number | null | undefined,
  locale: PortalLocale,
) {
  if (value == null || value <= 0) {
    return dashboardCopy[locale].noData;
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${getDecimalFormatter(locale).format(size)} ${units[unitIndex]}`;
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 20 7.5" />
      <path d="M12 12 4 7.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function ShipWheelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v4" />
      <path d="m4.9 4.9 2.8 2.8" />
      <path d="M2 12h4" />
      <path d="m4.9 19.1 2.8-2.8" />
      <path d="M12 18v4" />
      <path d="m19.1 19.1-2.8-2.8" />
      <path d="M18 12h4" />
      <path d="m19.1 4.9-2.8 2.8" />
    </svg>
  );
}

function SeasonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="m5.5 5.5 13 13" />
      <path d="m18.5 5.5-13 13" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
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

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
    </svg>
  );
}
