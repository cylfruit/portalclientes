import { fetchEmbarqueRows } from "@/lib/clickhouse";
import { ClientHomeDashboard } from "@/components/client-home-dashboard";
import { PortalShell } from "@/components/portal-shell";

export const dynamic = "force-dynamic";

async function loadDashboardRows() {
  try {
    const rows = await fetchEmbarqueRows();

    return {
      rows,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Failed to load shipment rows from ClickHouse", error);

    return {
      rows: [],
      errorMessage:
        "No fue posible cargar los embarques desde ClickHouse. Revisa la conexion y las credenciales de la base de datos.",
    };
  }
}

export default async function Home() {
  const { rows, errorMessage } = await loadDashboardRows();

  return (
    <PortalShell
      activePath="/"
      heading="Embarques"
      description="Resumen operativo por destino y estado del viaje para que el cliente revise sus embarques, documentos y fechas clave desde una sola vista."
    >
      <ClientHomeDashboard rows={rows} errorMessage={errorMessage} />
    </PortalShell>
  );
}
