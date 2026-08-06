import assert from "node:assert/strict";
import test from "node:test";
import {
  hasConfirmedTrackingDeparture,
  selectConfirmedTracking,
} from "./tracking-eligibility.ts";

const pendingEmbarque132 = {
  etd: "2026-08-07T22:00:00-04:00",
  atd: null,
};

const progressEstimate132 = {
  statusCode: "IN_TRANSIT",
  trackedAt: "2026-08-06T06:08:59.642Z",
  locationSource: "PROGRESS_ESTIMATE",
  lastEventDate: "2026-08-24T23:00:00-04:00",
  routePoints: [
    {
      state: "planned",
      date: "2026-08-07T22:00:00-04:00",
      label: "San Antonio",
      description: "Vessel departure",
    },
  ],
};

test("EMB 132 is not trackable before its pending departure", () => {
  assert.equal(
    hasConfirmedTrackingDeparture(
      pendingEmbarque132,
      progressEstimate132,
      "2026-08-06",
    ),
    false,
  );
});

test("PROGRESS_ESTIMATE never confirms a departure", () => {
  assert.equal(
    hasConfirmedTrackingDeparture(
      { etd: "2026-08-01", atd: null },
      { ...progressEstimate132, lastEventDate: "2026-08-05" },
      "2026-08-06",
    ),
    false,
  );
});

test("a confirmed ATD overrides an unconfirmed PROGRESS_ESTIMATE position", () => {
  // In practice ATD mirrors ETD, so a genuinely not-yet-departed shipment
  // always has a future ATD too (see the pending-departure test above). A
  // past ATD is the shipment's own operational record and should be trusted
  // even if the tracking provider's estimate has no matching keyword.
  assert.equal(
    hasConfirmedTrackingDeparture(
      { etd: "2026-08-01", atd: "2026-08-02" },
      progressEstimate132,
      "2026-08-06",
    ),
    true,
  );
});

test("a future completed departure event is not trackable yet", () => {
  const tracking = {
    ...progressEstimate132,
    locationSource: "CURRENT_POSITION",
    routePoints: [
      {
        state: "completed",
        date: "2026-08-07T22:00:00-04:00",
        label: "San Antonio",
        description: "Vessel departure",
      },
    ],
  };

  assert.equal(
    hasConfirmedTrackingDeparture(pendingEmbarque132, tracking, "2026-08-06"),
    false,
  );
});

test("a real completed departure enables tracking", () => {
  const tracking = {
    ...progressEstimate132,
    locationSource: "CURRENT_POSITION",
    lastEventDate: "2026-08-06T12:00:00-04:00",
    routePoints: [
      {
        state: "completed",
        date: "2026-08-06T10:00:00-04:00",
        label: "San Antonio",
        description: "Vessel departure",
      },
    ],
  };

  assert.equal(
    hasConfirmedTrackingDeparture(
      { etd: "2026-08-06", atd: null },
      tracking,
      "2026-08-06",
    ),
    true,
  );
});

test("candidate selection skips an invalid container snapshot", () => {
  const validVesselTracking = {
    ...progressEstimate132,
    locationSource: "CURRENT_POSITION",
    trackedAt: "2026-08-06T12:00:00-04:00",
    lastEventDate: "2026-08-06T12:00:00-04:00",
  };

  assert.equal(
    selectConfirmedTracking(
      { etd: "2026-08-06", atd: null },
      [progressEstimate132, validVesselTracking],
      "2026-08-06",
    ),
    validVesselTracking,
  );
});

test("PROGRESS_ESTIMATE with a real completed departure event is trackable", () => {
  // Mirrors a real container (MNBU0435244): no live AIS, but the provider
  // already reported a completed "Vessel departure" event at the origin.
  const tracking = {
    ...progressEstimate132,
    lastEventDate: "2026-07-24T21:32:00-04:00",
    routePoints: [
      {
        state: "completed",
        date: "2026-07-14T17:53:00-04:00",
        label: "Valparaiso",
        description: "Vessel departure",
      },
    ],
  };

  assert.equal(
    hasConfirmedTrackingDeparture(
      { etd: "2026-07-10", atd: null },
      tracking,
      "2026-08-06",
    ),
    true,
  );
});

test("real IN_TRANSIT tracking overrides a future ETD", () => {
  const tracking = {
    ...progressEstimate132,
    locationSource: "CURRENT_POSITION",
    trackedAt: "2026-08-06T12:00:00-04:00",
    lastEventDate: "2026-08-06T12:00:00-04:00",
    routePoints: [],
  };

  assert.equal(
    hasConfirmedTrackingDeparture(
      { etd: "2026-08-15", atd: null },
      tracking,
      "2026-08-06",
    ),
    true,
  );
});
