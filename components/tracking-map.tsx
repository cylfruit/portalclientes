"use client";

import { Fragment, memo, useMemo, useEffect, useState } from "react";
import {
  divIcon,
  latLngBounds,
  type DivIcon,
  type LatLngBoundsExpression,
  type LatLngExpression,
  type PointExpression,
} from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type {
  TrackingRoutePoint,
  TrackedShipmentItem,
} from "@/lib/portal-data";

type TrackingMapProps = {
  items: TrackedShipmentItem[];
  locale: "es" | "en";
  ariaLabel?: string;
  selectedShipmentId?: string | null;
  onSelectShipment?: (shipmentId: string) => void;
};

type PreparedTrackedItem = {
  item: TrackedShipmentItem;
  currentPosition: [number, number];
  routeVisuals: ReturnType<typeof buildRouteVisuals>;
  shipmentColor: string;
};

const DEFAULT_CENTER: [number, number] = [2.5, -35];
const DEFAULT_ZOOM = 2;
const CARTO_LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const WORLD_BOUNDS: LatLngBoundsExpression = [
  [-75, -180],
  [85, 180],
];
const PIN_SIZE: PointExpression = [38, 46];
const PIN_ANCHOR: PointExpression = [19, 46];
const PIN_TOOLTIP_ANCHOR: PointExpression = [0, -40];
const DESTINATION_ICON_SIZE: PointExpression = [22, 22];
const DESTINATION_ICON_ANCHOR: PointExpression = [11, 11];
const ROUTE_COLOR_PALETTE = [
  "#2563eb",
  "#0f766e",
  "#db2777",
  "#ea580c",
  "#7c3aed",
  "#16a34a",
  "#d97706",
  "#0891b2",
  "#be123c",
  "#4f46e5",
] as const;

const trackingMapCopy = {
  es: {
    approximateVesselPosition: "Posicion aproximada resuelta por nave",
    clickForDetails: "Haz clic para ver detalle",
  },
  en: {
    approximateVesselPosition: "Approximate position resolved by vessel",
    clickForDetails: "Click to view details",
  },
} as const;

const TrackingMapComponent = ({
  items,
  locale,
  ariaLabel,
  selectedShipmentId,
  onSelectShipment,
}: TrackingMapProps) => {
  const copy = trackingMapCopy[locale];
  const theme = useDocumentTheme();
  const tileUrl = theme === "dark" ? CARTO_DARK_TILES : CARTO_LIGHT_TILES;
  const preparedItems = useMemo<PreparedTrackedItem[]>(() => {
    return items.map((item) => ({
      item,
      currentPosition: [
        item.tracking.currentLatitude,
        item.tracking.currentLongitude,
      ],
      routeVisuals: buildRouteVisuals(item.tracking.routePoints),
      shipmentColor: getShipmentColor(item.shipment.groupKey),
    }));
  }, [items]);
  const orderedItems = useMemo(() => {
    if (!selectedShipmentId) {
      return preparedItems;
    }

    return [...preparedItems].sort((left, right) => {
      if (left.item.shipment.groupKey === selectedShipmentId) {
        return 1;
      }

      if (right.item.shipment.groupKey === selectedShipmentId) {
        return -1;
      }

      return 0;
    });
  }, [preparedItems, selectedShipmentId]);
  const hasSelection = Boolean(selectedShipmentId);
  const boundsPositions = useMemo<LatLngExpression[]>(() => {
    const positions: LatLngExpression[] = [];

    preparedItems.forEach(({ currentPosition, routeVisuals }) => {
      positions.push(...routeVisuals.allPositions);
      positions.push(currentPosition);
    });

    return positions;
  }, [preparedItems]);
  const markerIcons = useMemo(() => {
    const icons = new Map<string, DivIcon>();

    preparedItems.forEach(({ item, shipmentColor }) => {
      const { shipment } = item;
      const isSelected = shipment.groupKey === selectedShipmentId;
      const isDimmed = hasSelection && !isSelected;

      icons.set(
        shipment.groupKey,
        divIcon({
          className: "tracking-pin-wrapper",
          html: buildPinMarkup({
            shipmentId: shipment.id,
            color: shipmentColor,
            isSelected,
            isDimmed,
          }),
          iconSize: PIN_SIZE,
          iconAnchor: PIN_ANCHOR,
          tooltipAnchor: PIN_TOOLTIP_ANCHOR,
        }),
      );
    });

    return icons;
  }, [hasSelection, preparedItems, selectedShipmentId]);
  const destinationIcons = useMemo(() => {
    const icons = new Map<string, DivIcon>();

    preparedItems.forEach(({ item, routeVisuals, shipmentColor }) => {
      const { shipment } = item;

      if (
        routeVisuals.destinationPosition === null ||
        routeVisuals.destinationRotation === null
      ) {
        return;
      }

      const isSelected = shipment.groupKey === selectedShipmentId;
      const isDimmed = hasSelection && !isSelected;

      icons.set(
        shipment.groupKey,
        divIcon({
          className: "tracking-destination-wrapper",
          html: buildDestinationArrowMarkup({
            color: shipmentColor,
            isSelected,
            isDimmed,
            rotationDegrees: routeVisuals.destinationRotation,
          }),
          iconSize: DESTINATION_ICON_SIZE,
          iconAnchor: DESTINATION_ICON_ANCHOR,
        }),
      );
    });

    return icons;
  }, [hasSelection, preparedItems, selectedShipmentId]);

  return (
    <div
      className="tracking-map-shell h-full w-full"
      role="region"
      aria-label={ariaLabel}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        preferCanvas
        scrollWheelZoom={false}
        zoomControl
        doubleClickZoom
        touchZoom
        worldCopyJump
        minZoom={2}
        maxZoom={7}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={1}
        className="h-full w-full"
      >
        <TileLayer
          key={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        <FitTrackingBounds positions={boundsPositions} />

        {orderedItems.map(
          ({ item, currentPosition, routeVisuals, shipmentColor }) => {
            const { shipment, tracking, trackingMatchScope } = item;
            const isSelected = shipment.groupKey === selectedShipmentId;
            const traveledLineOpacity = isSelected
              ? 1
              : hasSelection
                ? 0.32
                : 0.86;
            const traveledOutlineOpacity = isSelected
              ? 0.92
              : hasSelection
                ? 0.22
                : 0.54;
            const plannedLineOpacity = isSelected
              ? 0.94
              : hasSelection
                ? 0.26
                : 0.72;
            const plannedOutlineOpacity = isSelected
              ? 0.72
              : hasSelection
                ? 0.18
                : 0.38;
            const haloOpacity = isSelected ? 0.26 : hasSelection ? 0.04 : 0.1;

            return (
              <Fragment
                key={`${shipment.groupKey}-${tracking.containerNumber}`}
              >
                {routeVisuals.traveledPositions.length > 1 ? (
                  <>
                    <Polyline
                      positions={routeVisuals.traveledPositions}
                      pathOptions={{
                        color: "rgba(255,255,255,0.92)",
                        weight: isSelected ? 9 : 7,
                        opacity: traveledOutlineOpacity,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                      eventHandlers={{
                        click: () => onSelectShipment?.(shipment.groupKey),
                      }}
                    />
                    <Polyline
                      positions={routeVisuals.traveledPositions}
                      pathOptions={{
                        color: shipmentColor,
                        weight: isSelected ? 5.5 : 4,
                        opacity: traveledLineOpacity,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                      eventHandlers={{
                        click: () => onSelectShipment?.(shipment.groupKey),
                      }}
                    />
                  </>
                ) : null}

                {routeVisuals.plannedPositions.length > 1 ? (
                  <>
                    <Polyline
                      positions={routeVisuals.plannedPositions}
                      pathOptions={{
                        color: "rgba(255,255,255,0.86)",
                        weight: isSelected ? 7 : 6,
                        opacity: plannedOutlineOpacity,
                        lineCap: "round",
                        lineJoin: "round",
                        dashArray: "12 14",
                      }}
                      eventHandlers={{
                        click: () => onSelectShipment?.(shipment.groupKey),
                      }}
                    />
                    <Polyline
                      positions={routeVisuals.plannedPositions}
                      pathOptions={{
                        color: shipmentColor,
                        weight: isSelected ? 4.25 : 3.25,
                        opacity: plannedLineOpacity,
                        lineCap: "round",
                        lineJoin: "round",
                        dashArray: "12 14",
                      }}
                      eventHandlers={{
                        click: () => onSelectShipment?.(shipment.groupKey),
                      }}
                    />
                  </>
                ) : null}

                <CircleMarker
                  center={currentPosition}
                  radius={isSelected ? 22 : 15}
                  pathOptions={{
                    color: shipmentColor,
                    weight: 0,
                    fillColor: shipmentColor,
                    fillOpacity: haloOpacity,
                  }}
                  eventHandlers={{
                    click: () => onSelectShipment?.(shipment.groupKey),
                  }}
                />

                <Marker
                  position={currentPosition}
                  icon={markerIcons.get(shipment.groupKey)}
                  eventHandlers={{
                    click: () => onSelectShipment?.(shipment.groupKey),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    <div>
                      <p className="text-sm font-semibold">
                        {shipment.recipientName}
                      </p>
                      <p className="text-xs opacity-85">
                        {trackingMatchScope === "vessel"
                          ? `${tracking.vesselName} · EMB ${shipment.id}`
                          : `${shipment.container} · EMB ${shipment.id}`}
                      </p>
                      <p className="text-xs opacity-85">
                        {tracking.lastEventLocationName ??
                          tracking.destinationName}
                      </p>
                      {trackingMatchScope === "vessel" ? (
                        <p className="text-xs opacity-85">
                          {copy.approximateVesselPosition}
                        </p>
                      ) : null}
                      <p className="text-xs opacity-85">
                        {copy.clickForDetails}
                      </p>
                    </div>
                  </Tooltip>
                </Marker>

                {routeVisuals.destinationPosition !== null ? (
                  <Marker
                    position={routeVisuals.destinationPosition}
                    icon={destinationIcons.get(shipment.groupKey)}
                    eventHandlers={{
                      click: () => onSelectShipment?.(shipment.groupKey),
                    }}
                  />
                ) : null}
              </Fragment>
            );
          },
        )}
      </MapContainer>
    </div>
  );
};

export const TrackingMap = memo(TrackingMapComponent);

TrackingMap.displayName = "TrackingMap";

function useDocumentTheme() {
  const [theme, setTheme] = useMemoizedTheme();

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setTheme(root.dataset.theme === "dark" ? "dark" : "light");
    };
    const observer = new MutationObserver(syncTheme);

    syncTheme();
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [setTheme]);

  return theme;
}

function useMemoizedTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return [theme, setTheme] as const;
}

function FitTrackingBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      map.invalidateSize(false);
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = latLngBounds(positions);

    if (bounds.isValid()) {
      map.invalidateSize(false);
      map.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: 6,
      });
    }
  }, [map, positions]);

  useEffect(() => {
    const syncMapSize = () => map.invalidateSize(false);

    syncMapSize();
    window.addEventListener("resize", syncMapSize);

    return () => window.removeEventListener("resize", syncMapSize);
  }, [map]);

  return null;
}

function getShipmentColor(groupKey: string) {
  return ROUTE_COLOR_PALETTE[hashString(groupKey) % ROUTE_COLOR_PALETTE.length];
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildPinMarkup({
  shipmentId,
  color,
  isSelected,
  isDimmed,
}: {
  shipmentId: string;
  color: string;
  isSelected: boolean;
  isDimmed: boolean;
}) {
  const ringColor = isSelected ? "#111827" : "rgba(255,255,255,0.96)";
  const shadowColor = isSelected
    ? "rgba(15,23,42,0.36)"
    : "rgba(15,23,42,0.18)";
  const scale = isSelected ? 1.08 : isDimmed ? 0.94 : 1;
  const opacity = isDimmed ? 0.56 : 1;

  return `
    <div class="tracking-pin-shell" style="--pin-scale:${scale};--pin-opacity:${opacity};">
      <div class="tracking-pin" style="--pin-color:${color};--pin-ring:${ringColor};--pin-shadow:${shadowColor};">
        <span class="tracking-pin__label">${escapeHtml(shipmentId)}</span>
      </div>
    </div>
  `;
}

function buildDestinationArrowMarkup({
  color,
  isSelected,
  isDimmed,
  rotationDegrees,
}: {
  color: string;
  isSelected: boolean;
  isDimmed: boolean;
  rotationDegrees: number;
}) {
  const scale = isSelected ? 1.08 : isDimmed ? 0.9 : 1;
  const opacity = isDimmed ? 0.48 : 0.92;

  return `
    <div class="tracking-destination-shell" style="--destination-scale:${scale};--destination-opacity:${opacity};">
      <div class="tracking-destination-arrow" style="--destination-color:${color};--destination-rotation:${rotationDegrees}deg;"></div>
    </div>
  `;
}

function buildRouteVisuals(routePoints: TrackingRoutePoint[]) {
  const allPositions = routePoints.map(
    (point) => [point.latitude, point.longitude] as [number, number],
  );

  if (allPositions.length === 0) {
    return {
      allPositions,
      traveledPositions: [] as [number, number][],
      plannedPositions: [] as [number, number][],
      destinationPosition: null as [number, number] | null,
      destinationRotation: null as number | null,
    };
  }

  let activeIndex = -1;
  let destinationIndex = -1;

  routePoints.forEach((point, index) => {
    if (point.state === "active" && activeIndex === -1) {
      activeIndex = index;
    }

    if (point.state === "planned") {
      destinationIndex = index;
    }
  });

  let traveledEndIndex = allPositions.length - 1;

  if (activeIndex >= 0) {
    traveledEndIndex = activeIndex;
  } else if (destinationIndex > 0) {
    traveledEndIndex = destinationIndex - 1;
  }

  const traveledPositions = allPositions.slice(0, traveledEndIndex + 1);
  const plannedPositions =
    activeIndex >= 0 && destinationIndex > activeIndex
      ? allPositions.slice(activeIndex, destinationIndex + 1)
      : [];
  const destinationPosition =
    destinationIndex >= 0 ? allPositions[destinationIndex] : null;
  const destinationRotation = destinationPosition
    ? computeDestinationRotation(
        plannedPositions.length > 1
          ? plannedPositions[plannedPositions.length - 2]
          : traveledPositions.length > 0
            ? traveledPositions[traveledPositions.length - 1]
            : null,
        destinationPosition,
      )
    : null;

  return {
    allPositions,
    traveledPositions,
    plannedPositions,
    destinationPosition,
    destinationRotation,
  };
}

function computeDestinationRotation(
  origin: [number, number] | null,
  destination: [number, number],
) {
  if (!origin) {
    return null;
  }

  const deltaLatitude = destination[0] - origin[0];
  const deltaLongitude = destination[1] - origin[1];

  if (deltaLatitude === 0 && deltaLongitude === 0) {
    return 0;
  }

  return (Math.atan2(-deltaLatitude, deltaLongitude) * 180) / Math.PI;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
