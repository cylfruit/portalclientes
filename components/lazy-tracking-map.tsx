"use client";

import dynamic from "next/dynamic";
import { preconnect } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from "react";
import type { TrackingMap as TrackingMapComponent } from "@/components/tracking-map";

const MAP_TILES_ORIGIN = "https://tiles.openfreemap.org";
// Tope de espera antes de montar el mapa aunque el navegador no quede ocioso.
const IDLE_ACTIVATE_MS = 1500;

type LazyTrackingMapProps = ComponentProps<typeof TrackingMapComponent>;

const copy = {
  es: {
    loading: "Cargando mapa…",
    load: "Cargar mapa",
    saver: "Mapa en pausa para ahorrar datos.",
  },
  en: {
    loading: "Loading map…",
    load: "Load map",
    saver: "Map paused to save data.",
  },
} as const;

function MapPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-cyl-surface/60 px-4 text-center text-sm text-cyl-muted"
    >
      {children}
    </div>
  );
}

// El mapa arrastra ~1.2 MB de JS (maplibre) + ~80 KB de CSS. Se descarga cuando el
// navegador queda libre tras la carga inicial (o antes, si el mapa entra en pantalla),
// para no competir con la tabla de embarques.
const TrackingMap = dynamic(
  () => import("@/components/tracking-map").then((module) => module.TrackingMap),
  {
    ssr: false,
    loading: () => <MapPlaceholder>…</MapPlaceholder>,
  },
);

type NetworkInformationLike = EventTarget & {
  saveData?: boolean;
  effectiveType?: string;
};

function getConnection() {
  return (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
}

function subscribeToConnection(onChange: () => void) {
  const connection = getConnection();

  connection?.addEventListener("change", onChange);
  return () => connection?.removeEventListener("change", onChange);
}

function isConstrainedConnection() {
  const connection = getConnection();

  return Boolean(
    connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g",
  );
}

function subscribeToNothing() {
  return () => {};
}

function lacksIntersectionObserver() {
  return typeof IntersectionObserver === "undefined";
}

/**
 * Carga el mapa al quedar el navegador libre tras la carga inicial, o cuando entra (casi) en pantalla. Con "ahorro de datos" o conexión 2G
 * no lo descarga solo: muestra un botón para cargarlo a pedido. Si el usuario elige un
 * embarque para verlo en el mapa, se carga igual.
 */
export function LazyTrackingMap(props: LazyTrackingMapProps) {
  const text = copy[props.locale];
  const containerRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  // En el servidor (y en la hidratación) se asume conexión normal: el HTML es el mismo.
  const constrained = useSyncExternalStore(
    subscribeToConnection,
    isConstrainedConnection,
    () => false,
  );
  const noObserver = useSyncExternalStore(
    subscribeToNothing,
    lacksIntersectionObserver,
    () => false,
  );
  const wantsMap =
    activated ||
    Boolean(props.selectedShipmentId) ||
    (noObserver && !constrained);

  useEffect(() => {
    const element = containerRef.current;

    if (wantsMap || constrained || !element || noObserver) {
      return;
    }

    // Abre ya la conexión (DNS + TLS) al servidor de tiles: es lo primero que el mapa
    // necesita y en conexiones lentas cuesta varios cientos de ms.
    preconnect(MAP_TILES_ORIGIN, { crossOrigin: "anonymous" });

    const activate = () => setActivated(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          activate();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(element);

    // No esperamos al scroll: en cuanto el navegador queda libre tras la carga inicial
    // se descarga y monta el mapa, para que ya esté listo cuando el usuario llegue.
    const idleId =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(activate, { timeout: IDLE_ACTIVATE_MS })
        : window.setTimeout(activate, IDLE_ACTIVATE_MS);

    return () => {
      observer.disconnect();

      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }

      window.clearTimeout(idleId);
    };
  }, [wantsMap, constrained, noObserver]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {wantsMap ? (
        <TrackingMap {...props} />
      ) : (
        <MapPlaceholder>
          {constrained ? (
            <>
              <span>{text.saver}</span>
              <button
                type="button"
                onClick={() => setActivated(true)}
                className="rounded-full border border-cyl-border px-4 py-2 font-semibold text-cyl-ink"
              >
                {text.load}
              </button>
            </>
          ) : (
            <span>{text.loading}</span>
          )}
        </MapPlaceholder>
      )}
    </div>
  );
}
