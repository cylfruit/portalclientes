import Link from "next/link";
import type { Metadata } from "next";
import { readCsrfTokenFromCookies, requireAdminPortalUser } from "@/lib/auth";
import { PortalUsersAdmin } from "@/components/portal-users-admin";
import { PortalShell } from "@/components/portal-shell";
import { fetchPortalClientUsers, fetchPortalReceivers } from "@/lib/clickhouse";
import {
  clientUsers,
  type PortalClientUser,
  type PortalReceiver,
  portalUserRoleBlueprint,
  portalUserSchema,
} from "@/lib/portal-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestion de accesos",
  description:
    "Administracion privada de usuarios, perfiles y accesos para clientes y recibidores C&L Fruit.",
  robots: {
    index: false,
    follow: false,
  },
};

async function loadPortalUsers() {
  try {
    const users = await fetchPortalClientUsers();

    return {
      users,
      errorMessage: null,
      dataSourceLabel: "ClickHouse",
    };
  } catch (error) {
    console.error("Failed to load portal users from ClickHouse", error);

    return {
      users: clientUsers,
      errorMessage:
        "La tabla PortalClientUsers aun no esta disponible en ClickHouse. La pantalla sigue usando datos de respaldo locales hasta que ejecutes el SQL del proyecto.",
      dataSourceLabel: "Fallback local",
    };
  }
}

function buildReceiversFallback(users: PortalClientUser[]): PortalReceiver[] {
  const uniqueReceivers = new Map<string, PortalReceiver>();

  users.forEach((user) => {
    if (!user.recipientCode || user.recipientCode === "MULTI") {
      return;
    }

    if (!uniqueReceivers.has(user.recipientCode)) {
      uniqueReceivers.set(user.recipientCode, {
        code: user.recipientCode,
        name: user.recipientName,
        rut: null,
        season: null,
      });
    }
  });

  return Array.from(uniqueReceivers.values()).sort((left, right) => {
    const nameOrder = left.name.localeCompare(right.name, "es");
    return nameOrder !== 0
      ? nameOrder
      : left.code.localeCompare(right.code, "es");
  });
}

async function loadPortalReceivers(users: PortalClientUser[]) {
  try {
    const receivers = await fetchPortalReceivers();

    return {
      receivers,
      receiverCatalogLabel: "PortalClientes.RECIBIDORES",
    };
  } catch (error) {
    console.error("Failed to load receivers from ClickHouse view", error);

    return {
      receivers: buildReceiversFallback(users),
      receiverCatalogLabel: "Usuarios ya configurados",
    };
  }
}

export default async function UsersPage() {
  await requireAdminPortalUser("/usuarios");
  const { users, errorMessage, dataSourceLabel } = await loadPortalUsers();
  const { receivers, receiverCatalogLabel } = await loadPortalReceivers(users);
  const csrfToken = await readCsrfTokenFromCookies();
  const activeUsers = users.filter((user) => user.status === "Activo").length;
  const enabledSecondFactor = users.filter((user) => user.twoFactor).length;
  const pendingUsers = users.filter(
    (user) => user.status === "Pendiente",
  ).length;
  const coveredRecipients = new Set(
    users
      .map((user) => user.recipientCode)
      .filter((recipientCode) => recipientCode && recipientCode !== "MULTI"),
  ).size;

  return (
    <PortalShell
      activePath="/usuarios"
      heading="Gestion de accesos para recibidores y clientes"
      description="Pantalla administrativa para configurar usuarios por recibidor, grupo y modulos habilitados, manteniendo el mismo tono grafico del portal principal de C&L y preparando la futura autenticacion real del cliente."
      aside={
        <div className="dark-panel p-6 text-white sm:p-7">
          <p className="section-kicker text-cyl-gold-soft/70">
            Administracion cliente
          </p>
          <h2 className="mt-3 text-4xl font-semibold text-white">
            {activeUsers} usuarios activos
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/78">
            Base sugerida para controlar acceso por CodRecibidor,
            CodigoGrupoRecibidor, idioma, JWT refresh y doble factor.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/68">2FA habilitado</p>
              <p className="mt-2 text-3xl font-semibold text-cyl-gold">
                {enabledSecondFactor}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/68">Pendientes</p>
              <p className="mt-2 text-3xl font-semibold text-cyl-gold">
                {pendingUsers}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyl-gold-soft/70">
              Relacion con la vista operativa
            </p>
            <div className="mt-4 space-y-2 text-sm leading-6 text-white/82">
              <p>Filtros naturales: CodRecibidor y CodigoGrupoRecibidor.</p>
              <p>Slice visible: embarques, pallets, documentos y alertas.</p>
              <p>
                Fuente actual: {dataSourceLabel} sobre {coveredRecipients}{" "}
                recibidores configurados.
              </p>
            </div>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyl-gold/45 hover:text-cyl-gold"
            >
              Volver al dashboard
            </Link>
          </div>
        </div>
      }
    >
      <PortalUsersAdmin
        initialUsers={users}
        initialReceivers={receivers}
        initialErrorMessage={errorMessage}
        initialDataSourceLabel={dataSourceLabel}
        receiverCatalogLabel={receiverCatalogLabel}
        csrfToken={csrfToken}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="panel p-6 sm:p-7">
            <p className="section-kicker text-cyl-gold">Perfiles sugeridos</p>
            <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
              Roles alineados al negocio
            </h2>
            <div className="mt-6 space-y-4">
              {portalUserRoleBlueprint.map((profile) => (
                <article
                  key={profile.name}
                  className="rounded-[1.4rem] border border-cyl-line bg-cyl-paper-strong/65 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-cyl-ink">
                        {profile.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-cyl-ink/70">
                        {profile.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-cyl-graphite px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyl-gold">
                      {profile.scope}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.modules.map((module) => (
                      <span
                        key={`${profile.name}-${module}`}
                        className="rounded-full border border-cyl-gold/25 bg-cyl-surface px-3 py-1 text-xs font-semibold text-cyl-ink"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel p-6 sm:p-7">
            <p className="section-kicker text-cyl-gold">Modelo tecnico</p>
            <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
              Campos para la tabla de accesos
            </h2>
            <p className="mt-2 text-sm leading-6 text-cyl-ink/72">
              Referencia de campos persistidos para los usuarios de recibidores,
              integrados con autenticacion JWT, CSRF y filtros directos sobre el
              portal.
            </p>

            <div className="table-shell mt-6 overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Tipo</th>
                    <th>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {portalUserSchema.map((field) => (
                    <tr key={field.name}>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {field.name}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {field.type}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm leading-6 text-cyl-ink/72">
                          {field.purpose}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="panel p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker text-cyl-gold">Operacion</p>
              <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
                Accesos conectados al portal
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyl-ink/72">
                Los formularios y acciones de esta pantalla llaman a las APIs
                internas del portal usando la sesion activa y el token CSRF.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-full border border-cyl-gold/35 px-5 py-3 text-sm font-semibold text-cyl-ink transition hover:bg-cyl-gold hover:text-cyl-black"
            >
              Ver embarques
            </Link>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-cyl-line bg-cyl-paper-strong/55 p-5 text-sm leading-6 text-cyl-ink/72">
            <p>
              Usa el formulario para crear cuentas nuevas, editar perfiles o
              bloquear accesos sin salir del panel.
            </p>
            <p className="mt-3">
              La lectura y las mutaciones consumen `/api/portal-users` y
              `/api/portal-users/[userId]` dentro del mismo proyecto.
            </p>
          </div>
        </div>
      </section>
    </PortalShell>
  );
}
