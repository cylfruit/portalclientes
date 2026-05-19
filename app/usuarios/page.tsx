import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import {
  clientUsers,
  portalMetrics,
  portalUserRoleBlueprint,
  portalUserSchema,
} from "@/lib/portal-data";

function userStatusClasses(status: string) {
  switch (status) {
    case "Activo":
      return "bg-emerald-50 text-emerald-700";
    case "Bloqueado":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default function UsersPage() {
  const activeUsers = clientUsers.filter(
    (user) => user.status === "Activo",
  ).length;
  const enabledSecondFactor = clientUsers.filter(
    (user) => user.twoFactor,
  ).length;
  const pendingUsers = clientUsers.filter(
    (user) => user.status === "Pendiente",
  ).length;

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
            CodigoGrupoRecibidor, modulos y doble factor.
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
                Escala inicial: {portalMetrics.recipients} recibidores en esta
                demo.
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="metric-card p-5">
          <p className="section-kicker text-cyl-gold">Usuarios activos</p>
          <p className="mt-4 text-4xl font-semibold text-cyl-ink">
            {activeUsers}
          </p>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
            Accesos listos para entrar y consultar sus embarques visibles.
          </p>
        </article>

        <article className="metric-card p-5">
          <p className="section-kicker text-cyl-gold">Recibidores cubiertos</p>
          <p className="mt-4 text-4xl font-semibold text-cyl-ink">
            {portalMetrics.recipients}
          </p>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
            Un usuario puede limitarse a un recibidor o abarcar todo el grupo
            comercial.
          </p>
        </article>

        <article className="metric-card p-5">
          <p className="section-kicker text-cyl-gold">2FA disponible</p>
          <p className="mt-4 text-4xl font-semibold text-cyl-ink">
            {enabledSecondFactor}
          </p>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
            Habilitado para perfiles de administracion cliente y supervisores
            internos.
          </p>
        </article>

        <article className="metric-card p-5">
          <p className="section-kicker text-cyl-gold">Usuarios pendientes</p>
          <p className="mt-4 text-4xl font-semibold text-cyl-ink">
            {pendingUsers}
          </p>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
            Invitaciones listas para activarse cuando el cliente reciba sus
            credenciales.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker text-cyl-gold">Mantenedor</p>
              <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
                Tabla para configurar usuarios cliente
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyl-ink/72">
                Este slice deja lista la pantalla que Comercial puede usar para
                crear, bloquear o ajustar el alcance de cada recibidor dentro
                del portal.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-full border border-cyl-gold/35 px-5 py-3 text-sm font-semibold text-cyl-ink transition hover:bg-cyl-gold hover:text-cyl-black"
            >
              Ver embarques
            </Link>
          </div>

          <div className="table-shell mt-6 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Recibidor</th>
                  <th>Perfil</th>
                  <th>Modulos</th>
                  <th>Estado</th>
                  <th>Ultimo acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-semibold text-cyl-ink">
                        {user.fullName}
                      </div>
                      <div className="mt-1 text-sm text-cyl-ink/60">
                        {user.email}
                      </div>
                      <div className="mt-1 text-sm text-cyl-ink/60">
                        {user.username}
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold text-cyl-ink">
                        {user.recipientName}
                      </div>
                      <div className="mt-1 text-sm text-cyl-ink/60">
                        {user.recipientCode} · {user.groupCode}
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold text-cyl-ink">
                        {user.role}
                      </div>
                      <div className="mt-1 text-sm text-cyl-ink/60">
                        {user.scope}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {user.modules.map((module) => (
                          <span
                            key={`${user.id}-${module}`}
                            className="rounded-full border border-cyl-gold/25 bg-white px-3 py-1 text-xs font-semibold text-cyl-ink"
                          >
                            {module}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${userStatusClasses(
                          user.status,
                        )}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-cyl-ink">
                        {user.lastAccess}
                      </div>
                      <div className="mt-1 text-sm text-cyl-ink/60">
                        {user.twoFactor ? "2FA activo" : "Sin 2FA"}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-full border border-cyl-line px-3 py-1 text-xs font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong">
                          Editar
                        </button>
                        <button className="rounded-full border border-cyl-line px-3 py-1 text-xs font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong">
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyl-gold">
                      {profile.scope}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.modules.map((module) => (
                      <span
                        key={`${profile.name}-${module}`}
                        className="rounded-full border border-cyl-gold/25 bg-white px-3 py-1 text-xs font-semibold text-cyl-ink"
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
              Base recomendada para persistir los usuarios de recibidores antes
              de conectar la autenticacion real y el filtro directo hacia
              `vw_Embarques_pc`.
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
      </section>
    </PortalShell>
  );
}
