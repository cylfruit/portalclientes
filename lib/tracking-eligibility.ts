export type TrackingEligibilityShipment = {
  etd: string | null;
  atd: string | null;
};

export type TrackingEligibilityRoutePoint = {
  state: "completed" | "active" | "planned";
  date: string | null;
  label: string;
  description: string | null;
};

export type TrackingEligibilitySnapshot = {
  statusCode: string;
  trackedAt: string | null;
  locationSource: string;
  lastEventDate: string | null;
  routePoints: TrackingEligibilityRoutePoint[];
};

const IN_TRANSIT_TRACKING_STATUS_CODES = new Set([
  "DEPARTED",
  "IN_TRANSIT",
  "IN_TRANSSHIPMENT",
  "LOADED",
  "TRANSSHIPMENT",
]);

export function extractTrackingDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const dateMatch = value.match(/\d{4}-\d{2}-\d{2}/);

  if (dateMatch) {
    return dateMatch[0];
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

export function getLocalTrackingDate(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isTrackingDateOnOrBefore(
  value: string | null | undefined,
  today = getLocalTrackingDate(),
) {
  const date = extractTrackingDate(value);
  return date !== null && date <= today;
}

export function isDepartureTrackingPoint(
  point: TrackingEligibilityRoutePoint,
  today = getLocalTrackingDate(),
) {
  if (point.state !== "completed" || !isTrackingDateOnOrBefore(point.date, today)) {
    return false;
  }

  const description = `${point.label} ${point.description ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    "depart",
    "loaded on vessel",
    "vessel sailing",
    "salida",
    "zarpe",
    "zarpado",
    "embarcado",
  ].some((keyword) => description.includes(keyword));
}

export function hasConfirmedTrackingDeparture(
  shipment: TrackingEligibilityShipment,
  tracking: TrackingEligibilitySnapshot | null,
  today = getLocalTrackingDate(),
) {
  if (isTrackingDateOnOrBefore(shipment.atd, today)) {
    return true;
  }

  // Estimated coordinates are generated from schedule/progress and are not
  // evidence that the container or vessel has departed.
  if (!tracking || tracking.locationSource === "PROGRESS_ESTIMATE") {
    return false;
  }

  if (
    tracking.routePoints.some((point) =>
      isDepartureTrackingPoint(point, today),
    )
  ) {
    return true;
  }

  // A future ETD takes precedence over generic IN_TRANSIT data from a provider.
  if (shipment.etd && !isTrackingDateOnOrBefore(shipment.etd, today)) {
    return false;
  }

  return (
    IN_TRANSIT_TRACKING_STATUS_CODES.has(
      tracking.statusCode.trim().toUpperCase(),
    ) &&
    isTrackingDateOnOrBefore(
      tracking.lastEventDate ?? tracking.trackedAt,
      today,
    )
  );
}

export function selectConfirmedTracking<T extends TrackingEligibilitySnapshot>(
  shipment: TrackingEligibilityShipment,
  candidates: Array<T | null>,
  today = getLocalTrackingDate(),
) {
  return (
    candidates.find(
      (tracking): tracking is T =>
        tracking !== null &&
        hasConfirmedTrackingDeparture(shipment, tracking, today),
    ) ?? null
  );
}
