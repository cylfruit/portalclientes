import {
  fetchContainerTrackingSnapshots,
  fetchEmbarqueRows,
  fetchEmbarqueSeasons,
  fetchVesselTrackingSnapshots,
  resolveDefaultEmbarqueSeasonCode,
} from "@/lib/clickhouse";
import {
  filterRowsForPortalUser,
  requireAuthenticatedPortalUser,
} from "@/lib/auth";
import { ClientHomeDashboard } from "@/components/client-home-dashboard";
import { PortalShell } from "@/components/portal-shell";

export const dynamic = "force-dynamic";

async function loadDashboardRows() {
  const currentUser = await requireAuthenticatedPortalUser("/");
  const locale = currentUser.preferredLocale;

  try {
    const seasons = await fetchEmbarqueSeasons();
    const defaultSeason =
      resolveDefaultEmbarqueSeasonCode(seasons) ??
      process.env.CLICKHOUSE_DEFAULT_SEASON?.trim() ??
      null;
    const rawRows = await fetchEmbarqueRows({ season: defaultSeason });
    const rows = filterRowsForPortalUser(rawRows, currentUser);
    const containers = Array.from(
      new Set(
        rows
          .map((row) => row.Contenedor?.trim())
          .filter((container): container is string => Boolean(container)),
      ),
    );
    const vesselNames = Array.from(
      new Set(
        rows
          .map((row) => row.NomNave?.trim())
          .filter((vesselName): vesselName is string => Boolean(vesselName)),
      ),
    );

    let trackingSnapshots: Awaited<
      ReturnType<typeof fetchContainerTrackingSnapshots>
    > = [];
    let vesselTrackingSnapshots: Awaited<
      ReturnType<typeof fetchVesselTrackingSnapshots>
    > = [];
    let trackingErrorMessage: string | null = null;

    try {
      const [containerTrackingResult, vesselTrackingResult] =
        await Promise.allSettled([
          fetchContainerTrackingSnapshots(containers),
          fetchVesselTrackingSnapshots(vesselNames),
        ]);

      if (containerTrackingResult.status === "fulfilled") {
        trackingSnapshots = containerTrackingResult.value;
      }

      if (vesselTrackingResult.status === "fulfilled") {
        vesselTrackingSnapshots = vesselTrackingResult.value;
      }

      if (
        containerTrackingResult.status === "rejected" &&
        vesselTrackingResult.status === "rejected"
      ) {
        throw containerTrackingResult.reason;
      }

      if (
        containerTrackingResult.status === "rejected" ||
        vesselTrackingResult.status === "rejected"
      ) {
        trackingErrorMessage =
          locale === "en"
            ? "Part of the ocean tracking could not be loaded from ContainerTrackingDaily. The portal first tried to resolve by container and then by vessel."
            : "Parte del tracking maritimo no se pudo cargar desde ContainerTrackingDaily. La vista intento resolver primero por contenedor y luego por nave.";
      }
    } catch (error) {
      console.error(
        "Failed to load container tracking rows from ClickHouse",
        error,
      );

      trackingErrorMessage =
        locale === "en"
          ? "Ocean tracking could not be loaded from ContainerTrackingDaily. Shipment data is still available."
          : "El tracking maritimo no se pudo cargar desde ContainerTrackingDaily. La tabla de embarques sigue disponible.";
    }

    return {
      rows,
      trackingSnapshots,
      vesselTrackingSnapshots,
      locale,
      seasons,
      defaultSeason,
      errorMessage: null,
      trackingErrorMessage,
    };
  } catch (error) {
    console.error("Failed to load shipment rows from ClickHouse", error);

    return {
      rows: [],
      trackingSnapshots: [],
      vesselTrackingSnapshots: [],
      locale,
      seasons: [],
      defaultSeason: null,
      errorMessage:
        locale === "en"
          ? "Shipments could not be loaded from ClickHouse. Check the database connection and credentials."
          : "No fue posible cargar los embarques desde ClickHouse. Revisa la conexion y las credenciales de la base de datos.",
      trackingErrorMessage: null,
    };
  }
}

export default async function Home() {
  const {
    rows,
    trackingSnapshots,
    vesselTrackingSnapshots,
    locale,
    seasons,
    defaultSeason,
    errorMessage,
    trackingErrorMessage,
  } = await loadDashboardRows();

  const heading = locale === "en" ? "Shipments" : "Embarques";
  const description =
    locale === "en"
      ? "Operational summary by destination and voyage status so each client can review shipments, documents, and key dates from a single screen."
      : "Resumen operativo por destino y estado del viaje para que el cliente revise sus embarques, documentos y fechas clave desde una sola vista.";

  return (
    <PortalShell activePath="/" heading={heading} description={description}>
      <ClientHomeDashboard
        locale={locale}
        rows={rows}
        trackingSnapshots={trackingSnapshots}
        vesselTrackingSnapshots={vesselTrackingSnapshots}
        seasons={seasons}
        defaultSeason={defaultSeason}
        errorMessage={errorMessage}
        trackingErrorMessage={trackingErrorMessage}
      />
    </PortalShell>
  );
}
