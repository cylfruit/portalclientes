"use client";

import { useState, type ReactNode } from "react";
import {
  buildShipmentsFromRows,
  formatDate,
  formatNumber,
  formatWeight,
  type EmbarqueRow,
  type ShipmentSummary,
} from "@/lib/portal-data";

type FilterState = {
  species: string;
  destination: string;
  season: string;
};

const ALL_SPECIES = "Todas las especies";
const ALL_DESTINATIONS = "Todos los destinos";
const ALL_SEASONS = "Todas las temporadas";

const numberWithDecimals = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type ClientHomeDashboardProps = {
  rows: EmbarqueRow[];
  errorMessage?: string | null;
};

export function ClientHomeDashboard({
  rows,
  errorMessage,
}: ClientHomeDashboardProps) {
  const filterMeta = buildFilterMeta(rows);
  const [draftFilters, setDraftFilters] = useState<FilterState>(
    filterMeta.defaultFilters,
  );
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(
    filterMeta.defaultFilters,
  );
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );

  const filteredRows = rows.filter((row) =>
    matchesRowWithFilters(row, appliedFilters),
  );
  const filteredShipments = buildShipmentsFromRows(filteredRows);
  const shipmentById = new Map(
    filteredShipments.map((shipment) => [shipment.groupKey, shipment]),
  );
  const totalShipments = filteredShipments.length;
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
  const selectedShipment = selectedShipmentId
    ? (shipmentById.get(selectedShipmentId) ?? null)
    : null;

  const metricCards = [
    {
      label: "Embarques",
      value: formatNumber(totalShipments),
      note: "Base total filtrada",
      accentClass: "text-[#f97316]",
      iconClass: "bg-[#fff0e6] text-[#f97316]",
      icon: <CalendarIcon />,
    },
    {
      label: "Kilos",
      value: formatNumber(totalWeight),
      note: "Peso total embarcado",
      accentClass: "text-[#16a34a]",
      iconClass: "bg-[#e6fbef] text-[#16a34a]",
      icon: <BoxIcon />,
    },
    {
      label: "Por zarpar",
      value: formatNumber(pendingShipments),
      note: `${formatPercent(pendingShipments, totalShipments)} del total`,
      accentClass: "text-[#f59e0b]",
      iconClass: "bg-[#fff6de] text-[#f59e0b]",
      icon: <ClockIcon />,
      progress: percentage(pendingShipments, totalShipments),
      progressClass: "bg-[#f59e0b]",
    },
    {
      label: "En transito",
      value: formatNumber(transitShipments),
      note: `${formatPercent(transitShipments, totalShipments)} del total`,
      accentClass: "text-[#0ea5e9]",
      iconClass: "bg-[#eaf7ff] text-[#0ea5e9]",
      icon: <BoltIcon />,
      progress: percentage(transitShipments, totalShipments),
      progressClass: "bg-[#0ea5e9]",
    },
    {
      label: "Arribados",
      value: formatNumber(arrivedShipments),
      note: `${formatPercent(arrivedShipments, totalShipments)} del total`,
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
              label="Especie"
              value={draftFilters.species}
              options={filterMeta.speciesOptions}
              icon={<FilterIcon />}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, species: value }))
              }
            />
            <FilterSelect
              label="Destino"
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
              label="Temporada"
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
                }}
                className="inline-flex h-12 items-center justify-center rounded-[1rem] bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/16">
                  <SparkleIcon />
                </span>
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(filterMeta.defaultFilters);
                  setAppliedFilters(filterMeta.defaultFilters);
                  setSelectedShipmentId(null);
                }}
                className="inline-flex h-12 items-center justify-center rounded-[1rem] bg-[#e5e7eb] px-4 text-sm font-semibold text-slate-700 transition hover:bg-[#d1d5db]"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/5">
                  <CloseIcon />
                </span>
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => downloadShipmentsAsCsv(filteredShipments)}
                disabled={filteredShipments.length === 0}
                className="inline-flex h-12 items-center justify-center rounded-[1rem] bg-[#059669] px-4 text-sm font-semibold text-white transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/14">
                  <DownloadIcon />
                </span>
                Excel
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-white/72">
            <p>
              Mostrando {formatNumber(totalShipments)} embarques,{" "}
              {formatNumber(totalBoxes)} cajas y {formatWeight(totalWeight)}.
            </p>
            <p>
              {activeFilters > 0
                ? `${formatNumber(activeFilters)} filtros activos sobre la vista.`
                : "Vista general cliente sin filtros adicionales."}
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
                    className={`text-sm font-semibold uppercase tracking-[0.1em] ${card.accentClass}`}
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
              Tracking maritimo
            </span>
            <h2 className="mt-4 text-3xl font-semibold text-cyl-ink">
              Seguimiento de mi fruta
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-cyl-ink/72">
              Ubicacion aproximada de las naves que hoy siguen activas para el
              cliente, usando el mismo lenguaje operativo del portal de C&amp;L.
            </p>
          </div>

          <div className="rounded-full border border-black/8 bg-[#fff9ef] px-4 py-2 text-sm font-semibold text-cyl-ink">
            {formatNumber(totalShipments)} embarques visibles
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="relative min-h-[360px] overflow-hidden rounded-[1.85rem] border border-black/8 bg-[#d7e1e6] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.85),transparent_26%),radial-gradient(circle_at_76%_22%,rgba(255,255,255,0.8),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(175,190,198,0.34))]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.42))]" />

            <MapLabel left="18%" top="68%" label="Chile" />
            <MapLabel left="13%" top="36%" label="America" />
            <MapLabel left="52%" top="20%" label="Europa" />
            <MapLabel left="65%" top="38%" label="Medio Oriente" />

            <div className="absolute left-[24%] top-[71%] flex items-center gap-2 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold text-cyl-ink shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
              <span className="flex h-3 w-3 rounded-full bg-[#111827]" />
              Origen C&amp;L
            </div>

            {filteredShipments.map((shipment) => {
              const marker = resolveMarker(shipment);

              return (
                <div
                  key={`${shipment.groupKey}-marker`}
                  className="absolute"
                  style={{ left: marker.left, top: marker.top }}
                >
                  <span
                    className={`absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full ${marker.pulseClass}`}
                  />
                  <span
                    className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${marker.dotClass}`}
                  />
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/94 px-3 py-1 text-[0.7rem] font-semibold text-cyl-ink shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                    {marker.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {filteredShipments.length === 0 ? (
              <EmptyState
                title="No hay viajes para ese cruce"
                description="Prueba limpiando los filtros o cambiando la combinacion para volver a ver los embarques disponibles."
              />
            ) : (
              filteredShipments.map((shipment) => (
                <article
                  key={`${shipment.groupKey}-tracking`}
                  className="rounded-[1.45rem] border border-black/8 bg-[#fffaf1] p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyl-ink/55">
                        EMB {shipment.id}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-cyl-ink">
                        {shipment.recipientName}
                      </h3>
                    </div>
                    <span className={shipmentStatusBadge(shipment.status)}>
                      {shipment.status === "Programado"
                        ? "Por zarpar"
                        : shipment.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-cyl-ink/70">
                    {shipment.route}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-black/8 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                        ETA
                      </p>
                      <p className="mt-2 text-sm font-semibold text-cyl-ink">
                        {formatDate(shipment.eta)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-black/8 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                        Nave
                      </p>
                      <p className="mt-2 text-sm font-semibold text-cyl-ink">
                        {shipment.vesselName}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="embarques" className="panel p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker text-cyl-gold">Detalle operativo</p>
            <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
              Embarques consolidados
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-cyl-ink/72">
              Vista agrupada desde `vw_Embarques_pc` para mostrar solo el
              embarque y sus datos operativos, sin repetir el detalle por
              pallet.
            </p>
          </div>

          <div className="rounded-full border border-cyl-gold/30 bg-[#fff9ef] px-4 py-2 text-sm font-semibold text-cyl-ink">
            {formatNumber(totalShipments)} embarques consolidados
          </div>
        </div>

        <div id="documentos" className="mt-6">
          {selectedShipment ? (
            <div className="rounded-[1.6rem] border border-black/8 bg-[#fffaf1] p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="section-kicker text-cyl-gold">
                      Documentos del embarque
                    </p>
                    <span className="rounded-full bg-[#111827] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyl-gold">
                      EMB {selectedShipment.id}
                    </span>
                    <span
                      className={shipmentStatusBadge(selectedShipment.status)}
                    >
                      {selectedShipment.status === "Programado"
                        ? "Por zarpar"
                        : selectedShipment.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-cyl-ink">
                    {selectedShipment.recipientName}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-cyl-ink/70">
                    {selectedShipment.vesselName} · {selectedShipment.container}{" "}
                    · {selectedShipment.route}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadShipmentDocumentsManifest(selectedShipment)
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#047857]"
                  >
                    <DownloadIcon />
                    Descargar docs
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShipmentId(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cyl-ink transition hover:bg-slate-50"
                  >
                    <CloseIcon />
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                    Fechas del viaje
                  </p>
                  <p className="mt-2 text-sm text-cyl-ink">
                    ETD {formatDate(selectedShipment.etd)} · ETA{" "}
                    {formatDate(selectedShipment.eta)}
                  </p>
                  <p className="mt-1 text-sm text-cyl-ink/70">
                    ATD {formatDate(selectedShipment.atd)} · ATA{" "}
                    {formatDate(selectedShipment.ata)}
                  </p>
                </div>
                <div className="rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyl-ink/55">
                    Datos comerciales
                  </p>
                  <p className="mt-2 text-sm text-cyl-ink">
                    BL {selectedShipment.bl} · Booking{" "}
                    {selectedShipment.booking}
                  </p>
                  <p className="mt-1 text-sm text-cyl-ink/70">
                    {selectedShipment.shippingLine} · {selectedShipment.market}
                  </p>
                </div>
                {selectedShipment.documents.map((document) => (
                  <div
                    key={`${selectedShipment.groupKey}-${document.label}`}
                    className="flex items-center justify-between gap-4 rounded-[1.15rem] border border-black/8 bg-white/88 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-cyl-ink">
                        {document.label}
                      </p>
                      <p className="mt-1 text-sm text-cyl-ink/65">
                        {document.value}
                      </p>
                    </div>
                    <span className={documentStateBadge(document.state)}>
                      {document.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[1.45rem] border border-dashed border-black/12 bg-[#fffdf8] px-5 py-4 text-sm text-cyl-ink/68">
              Usa el boton{" "}
              <span className="font-semibold text-cyl-ink">Ver docs</span>{" "}
              dentro de la tabla para abrir los documentos del embarque
              seleccionado.
            </div>
          )}
        </div>

        {filteredShipments.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Sin embarques en la tabla"
              description="No existen embarques para el cruce actual. Ajusta filtros o vuelve a la vista general para seguir trabajando."
            />
          </div>
        ) : (
          <div className="table-shell mt-6 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Embarque</th>
                  <th>Recibidor</th>
                  <th>Especie / Variedad</th>
                  <th>Nave / Contenedor</th>
                  <th>ETD / ETA</th>
                  <th>ATD / ATA</th>
                  <th>Totales</th>
                  <th>BL</th>
                  <th>Documentos</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => {
                  return (
                    <tr key={shipment.groupKey}>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {shipment.id}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {shipment.originPort} {" -> "}{" "}
                          {shipment.destinationPort}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {shipment.recipientName}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {shipment.recipientCode} · {shipment.recipientGroup}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {shipment.market}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {shipment.species.join(" · ")}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {shipment.varieties.join(" · ")}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {shipment.vesselName}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {shipment.shippingLine} · {shipment.container}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          ETD {formatDate(shipment.etd)}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          ETA {formatDate(shipment.eta)}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          ATD {formatDate(shipment.atd)}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          ATA {formatDate(shipment.ata)}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {formatNumber(shipment.totalBoxes)} cajas
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {formatWeight(shipment.netWeight)} ·{" "}
                          {shipment.pallets} pallets
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {shipment.bl}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {shipment.booking}
                        </div>
                      </td>
                      <td>
                        <div className="flex min-w-[11rem] flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedShipmentId(shipment.groupKey)
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-cyl-ink transition hover:bg-slate-50"
                          >
                            <EyeIcon />
                            Ver docs
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadShipmentDocumentsManifest(shipment)
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-[#059669] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#047857]"
                          >
                            <DownloadIcon />
                            Descargar
                          </button>
                        </div>
                      </td>
                    </tr>
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
    <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-[#fffdf8] p-6 text-center">
      <p className="text-lg font-semibold text-cyl-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-cyl-ink/68">{description}</p>
    </div>
  );
}

function MapLabel({
  left,
  top,
  label,
}: {
  left: string;
  top: string;
  label: string;
}) {
  return (
    <span
      className="absolute text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-slate-500/85"
      style={{ left, top }}
    >
      {label}
    </span>
  );
}

function buildFilterMeta(rows: EmbarqueRow[]) {
  const speciesOptions = [
    ALL_SPECIES,
    ...collectUniqueOptions(rows.map((row) => row.NomEspecie)),
  ];
  const destinationOptions = [
    ALL_DESTINATIONS,
    ...collectUniqueOptions(rows.map((row) => row.NomPuertoDestino)),
  ];
  const seasonValues = collectUniqueOptions(
    rows.map((row) => row.CodigoTemporada),
  );

  return {
    speciesOptions,
    destinationOptions,
    seasonOptions: [ALL_SEASONS, ...seasonValues],
    defaultFilters: {
      species: ALL_SPECIES,
      destination: ALL_DESTINATIONS,
      season: seasonValues[0] ?? ALL_SEASONS,
    } satisfies FilterState,
  };
}

function matchesRowWithFilters(row: EmbarqueRow, filters: FilterState) {
  const matchesSpecies =
    filters.species === ALL_SPECIES || row.NomEspecie === filters.species;
  const matchesDestination =
    filters.destination === ALL_DESTINATIONS ||
    row.NomPuertoDestino === filters.destination;
  const matchesSeason =
    filters.season === ALL_SEASONS || row.CodigoTemporada === filters.season;

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

function formatPercent(value: number, total: number) {
  if (total === 0) {
    return "0,0%";
  }

  return `${numberWithDecimals.format((value / total) * 100)}%`;
}

function countActiveFilters(filters: FilterState, defaultFilters: FilterState) {
  return [
    filters.species !== ALL_SPECIES,
    filters.destination !== ALL_DESTINATIONS,
    filters.season !== defaultFilters.season,
  ].filter(Boolean).length;
}

function downloadShipmentsAsCsv(shipments: ShipmentSummary[]) {
  const headers = [
    "Embarque",
    "Temporada",
    "Recibidor",
    "Grupo",
    "Consignatario",
    "PuertoOrigen",
    "PuertoDestino",
    "Pais",
    "Especie",
    "Variedad",
    "Nave",
    "Naviera",
    "Contenedor",
    "Cajas",
    "PesoNeto",
    "ETD",
    "ETA",
    "ATD",
    "ATA",
    "BL",
    "Booking",
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
  anchor.download = `embarques-clientes-${date}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function downloadShipmentDocumentsManifest(shipment: ShipmentSummary) {
  const lines = [
    `Embarque: ${shipment.id}`,
    `Recibidor: ${shipment.recipientName}`,
    `Consignatario: ${shipment.consignee}`,
    `Ruta: ${shipment.route}`,
    `Nave: ${shipment.vesselName}`,
    `Naviera: ${shipment.shippingLine}`,
    `Contenedor: ${shipment.container}`,
    `Total cajas: ${formatNumber(shipment.totalBoxes)}`,
    `Peso neto: ${formatWeight(shipment.netWeight)}`,
    `ETD: ${formatDate(shipment.etd)}`,
    `ETA: ${formatDate(shipment.eta)}`,
    `ATD: ${formatDate(shipment.atd)}`,
    `ATA: ${formatDate(shipment.ata)}`,
    `Estado: ${shipment.status === "Programado" ? "Por zarpar" : shipment.status}`,
    "",
    "Documentos:",
    ...shipment.documents.map(
      (document) =>
        `- ${document.label}: ${document.value} [${document.state}]`,
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `embarque-${shipment.id}-documentos.txt`;
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

function documentStateBadge(
  state: ShipmentSummary["documents"][number]["state"],
) {
  switch (state) {
    case "Emitido":
    case "Confirmado":
    case "Completo":
    case "Vigente":
      return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700";
    case "Parcial":
      return "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700";
    default:
      return "rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700";
  }
}

function resolveMarker(shipment: ShipmentSummary) {
  const destination = shipment.destinationPort;
  const baseMarker = {
    label: destination,
    left: "50%",
    top: "40%",
  };

  switch (destination) {
    case "Rotterdam":
      return {
        ...baseMarker,
        left: "57%",
        top: "25%",
        dotClass: "bg-[#0ea5e9]",
        pulseClass: "bg-[#0ea5e9]/20",
      };
    case "Long Beach":
      return {
        ...baseMarker,
        left: "18%",
        top: "36%",
        dotClass: "bg-[#10b981]",
        pulseClass: "bg-[#10b981]/20",
      };
    case "Jebel Ali":
      return {
        ...baseMarker,
        left: "69%",
        top: "40%",
        dotClass: "bg-[#f59e0b]",
        pulseClass: "bg-[#f59e0b]/20",
      };
    default:
      return {
        ...baseMarker,
        dotClass: "bg-[#111827]",
        pulseClass: "bg-[#111827]/15",
      };
  }
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
