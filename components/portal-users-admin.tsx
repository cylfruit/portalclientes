"use client";

import { useState } from "react";
import type { PortalClientUser, PortalReceiver } from "@/lib/portal-data";

const ROLE_OPTIONS = [
  { value: "client", label: "Cliente" },
  { value: "receiver", label: "Supervisor de calidad" },
  { value: "receiver_admin", label: "Administrador cliente" },
  { value: "admin", label: "Administrador interno" },
  { value: "superuser", label: "Superusuario" },
] as const;

const LOCALE_OPTIONS = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "English" },
] as const;

const STATUS_OPTIONS = ["Activo", "Pendiente", "Bloqueado"] as const;
const MODULE_OPTIONS = [
  "Embarques",
  "Pallets",
  "Documentos",
  "Usuarios",
  "Alertas",
] as const;

type PortalUserRoleKey = PortalClientUser["roleKey"];
type PortalUserLocale = PortalClientUser["locale"];
type PortalUserStatus = PortalClientUser["status"];
type PortalUserModule = (typeof MODULE_OPTIONS)[number];
type EditorMode = "create" | "edit";

type PortalUserFilters = {
  query: string;
  status: "" | PortalUserStatus;
};

type PortalUserFormState = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  roleKey: PortalUserRoleKey;
  preferredLocale: PortalUserLocale;
  recipientCode: string;
  recipientName: string;
  recipientGroupCode: string;
  canViewAll: boolean;
  modules: PortalUserModule[];
  status: PortalUserStatus;
  twoFactorEnabled: boolean;
};

type PortalUsersAdminProps = {
  initialUsers: PortalClientUser[];
  initialReceivers: PortalReceiver[];
  initialErrorMessage: string | null;
  initialDataSourceLabel: string;
  receiverCatalogLabel: string;
  csrfToken: string | null;
};

function createEmptyForm(): PortalUserFormState {
  return {
    fullName: "",
    username: "",
    email: "",
    password: "",
    roleKey: "client",
    preferredLocale: "es",
    recipientCode: "",
    recipientName: "",
    recipientGroupCode: "",
    canViewAll: false,
    modules: ["Embarques", "Documentos"],
    status: "Pendiente",
    twoFactorEnabled: false,
  };
}

function createFormFromUser(user: PortalClientUser): PortalUserFormState {
  const isGlobal = user.canViewAll || user.roleKey === "superuser";

  return {
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    password: "",
    roleKey: user.roleKey,
    preferredLocale: user.locale,
    recipientCode:
      isGlobal || user.recipientCode === "MULTI" ? "" : user.recipientCode,
    recipientName:
      isGlobal || user.recipientName === "Vista global"
        ? ""
        : user.recipientName,
    recipientGroupCode:
      isGlobal || user.groupCode === "GLOBAL" ? "" : user.groupCode,
    canViewAll: user.canViewAll,
    modules: sanitizeModules(user.modules),
    status: user.status,
    twoFactorEnabled: user.twoFactor,
  };
}

function sanitizeModules(modules: string[]): PortalUserModule[] {
  const values = modules.filter((module): module is PortalUserModule =>
    MODULE_OPTIONS.includes(module as PortalUserModule),
  );

  return values.length > 0 ? values : ["Embarques", "Documentos"];
}

function normalizeOptionalString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getUserStatusClasses(status: PortalUserStatus) {
  switch (status) {
    case "Activo":
      return "bg-emerald-50 text-emerald-700";
    case "Bloqueado":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function buildUsersUrl(filters: PortalUserFilters) {
  const searchParams = new URLSearchParams();

  if (filters.query.trim()) {
    searchParams.set("q", filters.query.trim());
  }

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  const queryString = searchParams.toString();
  return queryString ? `/api/portal-users?${queryString}` : "/api/portal-users";
}

function extractApiMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback;
}

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === "object" && payload !== null;
}

function isPortalUsersPayload(payload: unknown): payload is {
  items: PortalClientUser[];
} {
  return (
    isRecord(payload) && "items" in payload && Array.isArray(payload.items)
  );
}

function isPortalUserPayload(payload: unknown): payload is {
  item: PortalClientUser;
} {
  return (
    isRecord(payload) &&
    "item" in payload &&
    Boolean(payload.item) &&
    typeof payload.item === "object"
  );
}

async function readApiPayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildMutationPayload(form: PortalUserFormState, mode: EditorMode) {
  const canUseGlobalScope =
    form.roleKey === "admin" || form.roleKey === "superuser";
  const isGlobalScope =
    form.roleKey === "superuser" || (canUseGlobalScope && form.canViewAll);
  const payload: Record<string, unknown> = {
    fullName: form.fullName.trim(),
    username: form.username.trim(),
    email: form.email.trim(),
    roleKey: form.roleKey,
    preferredLocale: form.preferredLocale,
    recipientCode: isGlobalScope
      ? null
      : normalizeOptionalString(form.recipientCode),
    recipientName: isGlobalScope
      ? null
      : normalizeOptionalString(form.recipientName),
    recipientGroupCode: isGlobalScope
      ? null
      : normalizeOptionalString(form.recipientGroupCode),
    canViewAll: isGlobalScope,
    modules: form.modules,
    status: form.status,
    twoFactorEnabled: form.twoFactorEnabled,
  };

  const password = form.password.trim();

  if (mode === "create" || password.length > 0) {
    payload.password = password;
  }

  if (mode === "create") {
    payload.requiresPasswordReset = true;
  }

  return payload;
}

export function PortalUsersAdmin({
  initialUsers,
  initialReceivers,
  initialErrorMessage,
  initialDataSourceLabel,
  receiverCatalogLabel,
  csrfToken,
}: PortalUsersAdminProps) {
  const [users, setUsers] = useState(initialUsers);
  const [filters, setFilters] = useState<PortalUserFilters>({
    query: "",
    status: "",
  });
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [dataSourceLabel, setDataSourceLabel] = useState(
    initialDataSourceLabel,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [form, setForm] = useState<PortalUserFormState>(createEmptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  const canUseGlobalScope =
    form.roleKey === "admin" || form.roleKey === "superuser";
  const isGlobalScope =
    form.roleKey === "superuser" || (canUseGlobalScope && form.canViewAll);
  const isClientScope = form.roleKey === "client";
  const normalizedRecipientCode = form.recipientCode.trim();
  const selectedReceiver =
    initialReceivers.find(
      (receiver) => receiver.code === normalizedRecipientCode,
    ) ??
    (normalizedRecipientCode
      ? {
          code: normalizedRecipientCode,
          name: form.recipientName.trim() || normalizedRecipientCode,
          rut: null,
          season: null,
        }
      : null);
  const receiverOptions = selectedReceiver
    ? initialReceivers.some(
        (receiver) => receiver.code === selectedReceiver.code,
      )
      ? initialReceivers
      : [selectedReceiver, ...initialReceivers]
    : initialReceivers;
  const assignedUsersForReceiver = normalizedRecipientCode
    ? users.filter(
        (user) =>
          user.recipientCode === normalizedRecipientCode &&
          user.id !== activeUserId,
      ).length
    : 0;

  async function loadUsers(nextFilters = filters) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(buildUsersUrl(nextFilters), {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = await readApiPayload(response);
      const message = extractApiMessage(
        payload,
        "No fue posible cargar los usuarios del portal.",
      );

      if (response.status === 401) {
        window.location.assign("/login?next=/usuarios");
        return;
      }

      if (
        response.status === 403 &&
        message === "No tienes permisos para esta ruta."
      ) {
        window.location.assign("/");
        return;
      }

      if (!response.ok || !isPortalUsersPayload(payload)) {
        throw new Error(message);
      }

      setUsers(payload.items);
      setDataSourceLabel("ClickHouse");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cargar los usuarios del portal.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetEditor() {
    setEditorMode("create");
    setActiveUserId(null);
    setForm(createEmptyForm());
    setFormError(null);
  }

  function handleEdit(user: PortalClientUser) {
    setEditorMode("edit");
    setActiveUserId(user.id);
    setForm(createFormFromUser(user));
    setFormError(null);
    setSuccessMessage(null);
  }

  async function runMutation(
    endpoint: string,
    init: RequestInit,
    successText: string,
    nextEditorUserId: string | null,
  ) {
    if (!csrfToken) {
      setFormError(
        "No se encontro el token CSRF en la sesion actual. Recarga la pagina e intenta nuevamente.",
      );
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(endpoint, {
        ...init,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
          ...(init.headers ?? {}),
        },
      });
      const payload = await readApiPayload(response);
      const message = extractApiMessage(
        payload,
        "No fue posible guardar el usuario del portal.",
      );

      if (response.status === 401) {
        window.location.assign("/login?next=/usuarios");
        return;
      }

      if (
        response.status === 403 &&
        message === "No tienes permisos para esta ruta."
      ) {
        window.location.assign("/");
        return;
      }

      if (!response.ok) {
        throw new Error(message);
      }

      if (isPortalUserPayload(payload)) {
        setUsers((currentUsers) => {
          const remainingUsers = currentUsers.filter(
            (user) => user.id !== payload.item.id,
          );

          return [payload.item, ...remainingUsers].sort((left, right) =>
            left.fullName.localeCompare(right.fullName, "es"),
          );
        });

        if (nextEditorUserId && payload.item.id === nextEditorUserId) {
          setForm(createFormFromUser(payload.item));
        }
      }

      setSuccessMessage(successText);

      if (!nextEditorUserId) {
        resetEditor();
      }

      await loadUsers(filters);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el usuario del portal.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildMutationPayload(form, editorMode);
    const endpoint =
      editorMode === "create"
        ? "/api/portal-users"
        : `/api/portal-users/${activeUserId}`;
    const method = editorMode === "create" ? "POST" : "PATCH";
    const successText =
      editorMode === "create"
        ? "Usuario creado correctamente."
        : "Usuario actualizado correctamente.";

    await runMutation(
      endpoint,
      {
        method,
        body: JSON.stringify(payload),
      },
      successText,
      editorMode === "edit" ? activeUserId : null,
    );
  }

  async function handleStatusToggle(user: PortalClientUser) {
    const nextStatus = user.status === "Bloqueado" ? "Activo" : "Bloqueado";
    const successText =
      nextStatus === "Bloqueado"
        ? `Usuario ${user.username} bloqueado.`
        : `Usuario ${user.username} reactivado.`;

    await runMutation(
      `/api/portal-users/${user.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      },
      successText,
      activeUserId === user.id ? user.id : null,
    );
  }

  return (
    <div className="space-y-8">
      {errorMessage ? (
        <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50/95 px-5 py-4 text-sm text-amber-900 shadow-[0_14px_32px_rgba(146,64,14,0.08)]">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/95 px-5 py-4 text-sm text-emerald-900 shadow-[0_14px_32px_rgba(6,95,70,0.08)]">
          {successMessage}
        </div>
      ) : null}

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
            {coveredRecipients}
          </p>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
            Control operativo por recibidor, grupo y perfiles internos.
          </p>
        </article>

        <article className="metric-card p-5">
          <p className="section-kicker text-cyl-gold">2FA disponible</p>
          <p className="mt-4 text-4xl font-semibold text-cyl-ink">
            {enabledSecondFactor}
          </p>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
            Habilitado para perfiles sensibles y supervisores internos.
          </p>
        </article>

        <article className="metric-card p-5">
          <p className="section-kicker text-cyl-gold">Usuarios pendientes</p>
          <p className="mt-4 text-4xl font-semibold text-cyl-ink">
            {pendingUsers}
          </p>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/68">
            Invitaciones y cuentas listas para activarse o bloquearse.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="panel p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker text-cyl-gold">
                {editorMode === "create"
                  ? "Alta de usuario"
                  : "Edicion de acceso"}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
                {editorMode === "create"
                  ? "Crear usuario cliente"
                  : "Editar usuario seleccionado"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-cyl-ink/72">
                La pantalla administra usuarios usando las APIs protegidas del
                mismo proyecto y el catalogo operativo de recibidores.
              </p>
            </div>

            {editorMode === "edit" ? (
              <button
                type="button"
                onClick={resetEditor}
                className="rounded-full border border-cyl-line px-4 py-2 text-sm font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong"
              >
                Nuevo usuario
              </button>
            ) : null}
          </div>

          {formError ? (
            <div className="mt-6 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {formError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-cyl-ink">
                <span>Nombre completo</span>
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                  placeholder="Nombre y apellido"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-cyl-ink">
                <span>Username</span>
                <input
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                  placeholder="usuario_portal"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-cyl-ink">
                <span>Email</span>
                <input
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                  placeholder="cliente@empresa.com"
                  autoCapitalize="none"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-cyl-ink">
                <span>
                  {editorMode === "create"
                    ? "Password inicial"
                    : "Nueva password (opcional)"}
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                  placeholder="Minimo 10 caracteres"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-cyl-ink">
                <span>Rol</span>
                <select
                  value={form.roleKey}
                  onChange={(event) => {
                    const nextRole = event.target.value as PortalUserRoleKey;

                    setForm((current) => ({
                      ...current,
                      roleKey: nextRole,
                      recipientGroupCode:
                        nextRole === "client" ? "" : current.recipientGroupCode,
                      canViewAll:
                        nextRole === "superuser"
                          ? true
                          : nextRole === "admin"
                            ? current.canViewAll
                            : false,
                    }));
                  }}
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-cyl-ink">
                <span>Idioma</span>
                <select
                  value={form.preferredLocale}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      preferredLocale: event.target.value as PortalUserLocale,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                >
                  {LOCALE_OPTIONS.map((locale) => (
                    <option key={locale.value} value={locale.value}>
                      {locale.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-cyl-ink">
                <span>Estado</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as PortalUserStatus,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-cyl-ink md:col-span-2">
                <span>Recibidor</span>
                <select
                  value={form.recipientCode}
                  onChange={(event) => {
                    const nextCode = event.target.value;
                    const receiver = receiverOptions.find(
                      (item) => item.code === nextCode,
                    );

                    setForm((current) => ({
                      ...current,
                      recipientCode: nextCode,
                      recipientName: receiver?.name ?? "",
                    }));
                  }}
                  disabled={isGlobalScope}
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55 disabled:cursor-not-allowed disabled:bg-black/3 disabled:text-cyl-ink/40"
                >
                  <option value="">Selecciona un recibidor</option>
                  {receiverOptions.map((receiver) => (
                    <option key={receiver.code} value={receiver.code}>
                      {receiver.name} · {receiver.code}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-cyl-ink/56">
                  Catalogo actual: {receiverCatalogLabel}. Un mismo recibidor
                  puede tener uno o mas usuarios asociados.
                </p>
              </label>

              {!isGlobalScope ? (
                <div className="md:col-span-2 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.2rem] border border-cyl-line bg-cyl-paper-strong/55 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyl-ink/45">
                      Recibidor seleccionado
                    </p>
                    {selectedReceiver ? (
                      <>
                        <p className="mt-3 text-base font-semibold text-cyl-ink">
                          {selectedReceiver.name}
                        </p>
                        <p className="mt-1 text-sm text-cyl-ink/62">
                          Codigo {selectedReceiver.code}
                          {selectedReceiver.rut
                            ? ` · RUT ${selectedReceiver.rut}`
                            : ""}
                        </p>
                        <p className="mt-1 text-sm text-cyl-ink/62">
                          {selectedReceiver.season
                            ? `Temporada ${selectedReceiver.season}`
                            : "Sin temporada informada"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-cyl-ink/62">
                        Selecciona un recibidor desde la vista operativa para
                        asignar este acceso.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[1.2rem] border border-cyl-line bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyl-ink/45">
                      Usuarios vinculados
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-cyl-ink">
                      {normalizedRecipientCode ? assignedUsersForReceiver : "-"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-cyl-ink/62">
                      {normalizedRecipientCode
                        ? assignedUsersForReceiver === 0
                          ? "Sera el primer usuario creado para este recibidor."
                          : assignedUsersForReceiver === 1
                            ? "Ya existe 1 usuario asociado a este recibidor."
                            : `Ya existen ${assignedUsersForReceiver} usuarios asociados a este recibidor.`
                        : "Elige un recibidor para ver cuantos usuarios ya tiene asociados."}
                    </p>
                  </div>
                </div>
              ) : null}

              <label className="space-y-2 text-sm font-medium text-cyl-ink md:col-span-2">
                <span>Codigo grupo recibidor (opcional)</span>
                <input
                  value={form.recipientGroupCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipientGroupCode: event.target.value,
                    }))
                  }
                  disabled={isGlobalScope || isClientScope}
                  className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55 disabled:cursor-not-allowed disabled:bg-black/3 disabled:text-cyl-ink/40"
                  placeholder="Filtro adicional por grupo si aplica"
                />
                <p className="text-xs leading-5 text-cyl-ink/56">
                  {isClientScope
                    ? "El rol Cliente se restringe solo al CodigoRecibidor seleccionado y no hereda acceso por grupo."
                    : "Campo opcional y adicional al CodigoRecibidor. La asignacion principal del usuario se resuelve desde la vista de recibidores."}
                </p>
              </label>
            </div>

            <div className="rounded-[1.2rem] border border-cyl-line bg-cyl-paper-strong/55 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-cyl-ink">
                    Alcance del acceso
                  </p>
                  <p className="mt-1 text-sm leading-6 text-cyl-ink/70">
                    Solo administracion interna o superusuarios pueden tener
                    vista global.
                  </p>
                </div>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-cyl-ink">
                  <input
                    type="checkbox"
                    checked={isGlobalScope}
                    disabled={
                      !canUseGlobalScope || form.roleKey === "superuser"
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        canViewAll: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-cyl-line text-cyl-gold focus:ring-cyl-gold"
                  />
                  Vista global
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-3 text-sm text-cyl-ink">
                  <input
                    type="checkbox"
                    checked={form.twoFactorEnabled}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        twoFactorEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-cyl-line text-cyl-gold focus:ring-cyl-gold"
                  />
                  Requerir 2FA
                </label>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-cyl-line bg-cyl-paper-strong/55 p-4">
              <p className="text-sm font-semibold text-cyl-ink">
                Modulos habilitados
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {MODULE_OPTIONS.map((module) => {
                  const checked = form.modules.includes(module);

                  return (
                    <label
                      key={module}
                      className="inline-flex items-center gap-3 rounded-[0.95rem] border border-cyl-line bg-white px-4 py-3 text-sm font-medium text-cyl-ink"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setForm((current) => {
                            if (current.modules.includes(module)) {
                              if (current.modules.length === 1) {
                                return current;
                              }

                              return {
                                ...current,
                                modules: current.modules.filter(
                                  (item) => item !== module,
                                ),
                              };
                            }

                            return {
                              ...current,
                              modules: [...current.modules, module],
                            };
                          })
                        }
                        className="h-4 w-4 rounded border-cyl-line text-cyl-gold focus:ring-cyl-gold"
                      />
                      {module}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-cyl-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-cyl-ink/68">
                Las mutaciones usan cabecera x-csrf-token y cookies JWT del
                portal.
              </p>

              <div className="flex flex-wrap gap-3">
                {editorMode === "edit" ? (
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="rounded-full border border-cyl-line px-5 py-3 text-sm font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong"
                  >
                    Cancelar
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full border border-cyl-gold/45 bg-cyl-gold px-5 py-3 text-sm font-semibold text-cyl-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isSaving
                    ? "Guardando..."
                    : editorMode === "create"
                      ? "Crear usuario"
                      : "Guardar cambios"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="panel p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker text-cyl-gold">Mantenedor</p>
              <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
                Usuarios cargados en el portal
              </h2>
              <p className="mt-2 text-sm leading-6 text-cyl-ink/72">
                Fuente actual: {dataSourceLabel}. Puedes filtrar, editar y
                bloquear accesos sin salir del portal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadUsers(filters)}
              disabled={isLoading}
              className="rounded-full border border-cyl-line px-5 py-3 text-sm font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isLoading ? "Actualizando..." : "Recargar"}
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void loadUsers(filters);
            }}
            className="mt-6 grid gap-4 md:grid-cols-[1fr_220px_auto]"
          >
            <label className="space-y-2 text-sm font-medium text-cyl-ink">
              <span>Buscar por nombre, email o username</span>
              <input
                value={filters.query}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    query: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
                placeholder="RBC, admin, camila..."
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-cyl-ink">
              <span>Estado</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as PortalUserFilters["status"],
                  }))
                }
                className="w-full rounded-2xl border border-cyl-line bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/55"
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full border border-cyl-gold/35 px-5 py-3 text-sm font-semibold text-cyl-ink transition hover:bg-cyl-gold hover:text-cyl-black disabled:cursor-not-allowed disabled:opacity-65"
              >
                Filtrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextFilters = {
                    query: "",
                    status: "",
                  } satisfies PortalUserFilters;
                  setFilters(nextFilters);
                  void loadUsers(nextFilters);
                }}
                className="rounded-full border border-cyl-line px-5 py-3 text-sm font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong"
              >
                Limpiar
              </button>
            </div>
          </form>

          {users.length === 0 ? (
            <div className="mt-6 rounded-[1.45rem] border border-dashed border-black/12 bg-[#fffdf8] px-5 py-4 text-sm text-cyl-ink/68">
              No hay usuarios que coincidan con los filtros actuales. Ajusta la
              busqueda o crea el primer acceso desde el formulario.
            </div>
          ) : (
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
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={
                        activeUserId === user.id ? "bg-cyl-paper-strong/45" : ""
                      }
                    >
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
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {user.canViewAll
                            ? "Vista global habilitada"
                            : "Filtrado por recibidor"}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-cyl-ink">
                          {user.role}
                        </div>
                        <div className="mt-1 text-sm text-cyl-ink/60">
                          {user.scope} · Idioma {user.locale.toUpperCase()}
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
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getUserStatusClasses(
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
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            className="rounded-full border border-cyl-line px-3 py-1 text-xs font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStatusToggle(user)}
                            disabled={isSaving}
                            className="rounded-full border border-cyl-line px-3 py-1 text-xs font-semibold text-cyl-ink transition hover:border-cyl-gold/45 hover:bg-cyl-paper-strong disabled:cursor-not-allowed disabled:opacity-65"
                          >
                            {user.status === "Bloqueado"
                              ? "Reactivar"
                              : "Bloquear"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
