import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { type PortalClientUser } from "@/lib/portal-data";

const lastAccessFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const PORTAL_USER_ROLE_KEYS = [
  "client",
  "receiver",
  "receiver_admin",
  "admin",
  "superuser",
] as const;

export const PORTAL_USER_STATUSES = [
  "Activo",
  "Pendiente",
  "Bloqueado",
] as const;

export const PORTAL_USER_LOCALES = ["es", "en"] as const;

export const PORTAL_USER_MODULES = [
  "Embarques",
  "Pallets",
  "Documentos",
  "Usuarios",
  "Alertas",
] as const;

export type PortalClientUserRoleKey = (typeof PORTAL_USER_ROLE_KEYS)[number];
export type PortalClientUserStatus = (typeof PORTAL_USER_STATUSES)[number];
export type PortalClientUserLocale = (typeof PORTAL_USER_LOCALES)[number];
export type PortalClientUserModule = (typeof PORTAL_USER_MODULES)[number];

export type PortalClientUserRecord = {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  roleKey: PortalClientUserRoleKey;
  preferredLocale: PortalClientUserLocale;
  recipientCode: string | null;
  recipientName: string | null;
  recipientGroupCode: string | null;
  canViewAll: boolean;
  modules: PortalClientUserModule[];
  status: PortalClientUserStatus;
  twoFactorEnabled: boolean;
  requiresPasswordReset: boolean;
  refreshTokenVersion: number;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type PortalPasswordResetTokenRecord = {
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  version: number;
};

export const MIN_PORTAL_PASSWORD_LENGTH = 10;

export type PortalClientUserFilters = {
  q?: string | null;
  recipientCode?: string | null;
  status?: PortalClientUserStatus | null;
};

export type PortalClientUserCreateInput = {
  username: string;
  email: string;
  fullName: string;
  password: string;
  roleKey: PortalClientUserRoleKey;
  preferredLocale: PortalClientUserLocale;
  recipientCode: string | null;
  recipientName: string | null;
  recipientGroupCode: string | null;
  canViewAll: boolean;
  modules: PortalClientUserModule[];
  status: PortalClientUserStatus;
  twoFactorEnabled: boolean;
  requiresPasswordReset: boolean;
};

export type PortalClientUserUpdateInput = {
  username?: string;
  email?: string;
  fullName?: string;
  password?: string;
  roleKey?: PortalClientUserRoleKey;
  preferredLocale?: PortalClientUserLocale;
  recipientCode?: string | null;
  recipientName?: string | null;
  recipientGroupCode?: string | null;
  canViewAll?: boolean;
  modules?: PortalClientUserModule[];
  status?: PortalClientUserStatus;
  twoFactorEnabled?: boolean;
  requiresPasswordReset?: boolean;
  refreshTokenVersion?: number;
  lastAccessAt?: string | null;
};

export class PortalUserValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PortalUserValidationError";
    this.statusCode = statusCode;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "si"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeRoleKey(value: unknown, fallback: PortalClientUserRoleKey) {
  const normalized = normalizeString(value);

  if (
    normalized &&
    PORTAL_USER_ROLE_KEYS.includes(normalized as PortalClientUserRoleKey)
  ) {
    return normalized as PortalClientUserRoleKey;
  }

  return fallback;
}

function normalizeStatus(value: unknown, fallback: PortalClientUserStatus) {
  const normalized = normalizeString(value);

  if (
    normalized &&
    PORTAL_USER_STATUSES.includes(normalized as PortalClientUserStatus)
  ) {
    return normalized as PortalClientUserStatus;
  }

  return fallback;
}

function normalizeLocale(value: unknown, fallback: PortalClientUserLocale) {
  const normalized = normalizeString(value);

  if (
    normalized &&
    PORTAL_USER_LOCALES.includes(normalized as PortalClientUserLocale)
  ) {
    return normalized as PortalClientUserLocale;
  }

  return fallback;
}

function normalizeModules(value: unknown, fallback: PortalClientUserModule[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const modules = Array.from(
    new Set(
      value
        .map((entry) => normalizeString(entry))
        .filter(
          (entry): entry is PortalClientUserModule =>
            Boolean(entry) &&
            PORTAL_USER_MODULES.includes(entry as PortalClientUserModule),
        ),
    ),
  );

  return modules.length > 0 ? modules : fallback;
}

function normalizeNullableRecipient(value: unknown) {
  return normalizeString(value);
}

function requireStringField(
  record: Record<string, unknown>,
  fieldName: string,
  label: string,
) {
  const value = normalizeString(record[fieldName]);

  if (!value) {
    throw new PortalUserValidationError(`${label} es obligatorio.`);
  }

  return value;
}

function normalizeRecipientScope<
  T extends {
    roleKey: PortalClientUserRoleKey;
    canViewAll: boolean;
    recipientCode: string | null;
    recipientName: string | null;
    recipientGroupCode: string | null;
  },
>(input: T): T {
  const canViewAll = input.canViewAll || input.roleKey === "superuser";

  if (canViewAll) {
    return {
      ...input,
      canViewAll: true,
      recipientCode: null,
      recipientName: null,
      recipientGroupCode: null,
    };
  }

  if (!input.recipientCode) {
    throw new PortalUserValidationError(
      "RecipientCode es obligatorio para usuarios acotados por recibidor.",
    );
  }

  if (input.roleKey === "client") {
    return {
      ...input,
      canViewAll: false,
      recipientGroupCode: null,
    };
  }

  return {
    ...input,
    canViewAll: false,
  };
}

function formatStoredDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

export function resolvePortalUserRoleLabel(roleKey: PortalClientUserRoleKey) {
  switch (roleKey) {
    case "client":
      return "Cliente";
    case "receiver_admin":
      return "Administrador cliente";
    case "admin":
      return "Administrador interno";
    case "superuser":
      return "Superusuario";
    default:
      return "Supervisor de calidad";
  }
}

export function resolvePortalUserScopeLabel(record: {
  roleKey: PortalClientUserRoleKey;
  canViewAll: boolean;
}) {
  if (record.canViewAll || record.roleKey === "superuser") {
    return "Vista global";
  }

  switch (record.roleKey) {
    case "client":
      return "Solo su recibidor";
    case "receiver_admin":
      return "Todo el recibidor";
    case "admin":
      return "Operacion transversal";
    default:
      return "Solo lectura operativa";
  }
}

export function formatPortalUserLastAccess(
  value: string | null,
  status: PortalClientUserStatus,
) {
  if (!value) {
    switch (status) {
      case "Pendiente":
        return "Invitacion enviada";
      case "Bloqueado":
        return "Acceso bloqueado";
      default:
        return "Sin acceso";
    }
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return lastAccessFormatter.format(parsedDate);
}

export function hashPortalUserPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

export function verifyPortalUserPassword(
  password: string,
  passwordHash: string,
) {
  const [algorithm, salt, expectedHash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}

export function validatePortalPassword(password: string, label = "La password") {
  if (password.length < MIN_PORTAL_PASSWORD_LENGTH) {
    throw new PortalUserValidationError(
      `${label} debe tener al menos ${MIN_PORTAL_PASSWORD_LENGTH} caracteres.`,
    );
  }
}

export function mapPortalClientUserRecordToView(
  record: PortalClientUserRecord,
): PortalClientUser {
  return {
    id: record.userId,
    fullName: record.fullName,
    username: record.username,
    email: record.email,
    roleKey: record.roleKey,
    role: resolvePortalUserRoleLabel(record.roleKey),
    locale: record.preferredLocale,
    recipientCode:
      record.recipientCode ?? (record.canViewAll ? "MULTI" : "Sin codigo"),
    recipientName:
      record.recipientName ??
      (record.canViewAll ? "Vista global" : "Sin recibidor"),
    groupCode:
      record.recipientGroupCode ?? (record.canViewAll ? "GLOBAL" : "Sin grupo"),
    canViewAll: record.canViewAll,
    modules: record.modules,
    status: record.status,
    lastAccess: formatPortalUserLastAccess(record.lastAccessAt, record.status),
    twoFactor: record.twoFactorEnabled,
    scope: resolvePortalUserScopeLabel(record),
  };
}

export function parsePortalClientUserCreateInput(payload: unknown) {
  if (!isRecord(payload)) {
    throw new PortalUserValidationError("Payload invalido para crear usuario.");
  }

  const normalized = normalizeRecipientScope({
    username: requireStringField(payload, "username", "Username"),
    email: requireStringField(payload, "email", "Email"),
    fullName: requireStringField(payload, "fullName", "Nombre completo"),
    password: requireStringField(payload, "password", "Password"),
    roleKey: normalizeRoleKey(payload.roleKey, "receiver"),
    preferredLocale: normalizeLocale(payload.preferredLocale, "es"),
    recipientCode: normalizeNullableRecipient(payload.recipientCode),
    recipientName: normalizeNullableRecipient(payload.recipientName),
    recipientGroupCode: normalizeNullableRecipient(payload.recipientGroupCode),
    canViewAll: normalizeBoolean(payload.canViewAll, false),
    modules: normalizeModules(payload.modules, ["Embarques", "Documentos"]),
    status: normalizeStatus(payload.status, "Pendiente"),
    twoFactorEnabled: normalizeBoolean(payload.twoFactorEnabled, false),
    requiresPasswordReset: normalizeBoolean(
      payload.requiresPasswordReset,
      true,
    ),
  });

  validatePortalPassword(normalized.password);

  return normalized;
}

export function parsePortalClientUserUpdateInput(payload: unknown) {
  if (!isRecord(payload)) {
    throw new PortalUserValidationError(
      "Payload invalido para actualizar usuario.",
    );
  }

  const normalized: PortalClientUserUpdateInput = {};

  if (payload.username !== undefined) {
    const username = normalizeString(payload.username);

    if (!username) {
      throw new PortalUserValidationError("Username no puede quedar vacio.");
    }

    normalized.username = username;
  }

  if (payload.email !== undefined) {
    const email = normalizeString(payload.email);

    if (!email) {
      throw new PortalUserValidationError("Email no puede quedar vacio.");
    }

    normalized.email = email;
  }

  if (payload.fullName !== undefined) {
    const fullName = normalizeString(payload.fullName);

    if (!fullName) {
      throw new PortalUserValidationError(
        "Nombre completo no puede quedar vacio.",
      );
    }

    normalized.fullName = fullName;
  }

  if (payload.password !== undefined) {
    const password = normalizeString(payload.password);

    if (!password) {
      throw new PortalUserValidationError(
        "La nueva password es obligatoria.",
      );
    }

    validatePortalPassword(password, "La nueva password");
    normalized.password = password;
  }

  if (payload.roleKey !== undefined) {
    normalized.roleKey = normalizeRoleKey(payload.roleKey, "receiver");
  }

  if (payload.preferredLocale !== undefined) {
    normalized.preferredLocale = normalizeLocale(payload.preferredLocale, "es");
  }

  if (payload.recipientCode !== undefined) {
    normalized.recipientCode = normalizeNullableRecipient(
      payload.recipientCode,
    );
  }

  if (payload.recipientName !== undefined) {
    normalized.recipientName = normalizeNullableRecipient(
      payload.recipientName,
    );
  }

  if (payload.recipientGroupCode !== undefined) {
    normalized.recipientGroupCode = normalizeNullableRecipient(
      payload.recipientGroupCode,
    );
  }

  if (payload.canViewAll !== undefined) {
    normalized.canViewAll = normalizeBoolean(payload.canViewAll, false);
  }

  if (payload.modules !== undefined) {
    normalized.modules = normalizeModules(payload.modules, [
      "Embarques",
      "Documentos",
    ]);
  }

  if (payload.status !== undefined) {
    normalized.status = normalizeStatus(payload.status, "Pendiente");
  }

  if (payload.twoFactorEnabled !== undefined) {
    normalized.twoFactorEnabled = normalizeBoolean(
      payload.twoFactorEnabled,
      false,
    );
  }

  if (payload.requiresPasswordReset !== undefined) {
    normalized.requiresPasswordReset = normalizeBoolean(
      payload.requiresPasswordReset,
      true,
    );
  }

  if (payload.refreshTokenVersion !== undefined) {
    const version = Number(payload.refreshTokenVersion);

    if (!Number.isInteger(version) || version < 1) {
      throw new PortalUserValidationError(
        "RefreshTokenVersion debe ser un entero positivo.",
      );
    }

    normalized.refreshTokenVersion = version;
  }

  if (payload.lastAccessAt !== undefined) {
    normalized.lastAccessAt = formatStoredDate(
      normalizeString(payload.lastAccessAt),
    );
  }

  if (Object.keys(normalized).length === 0) {
    throw new PortalUserValidationError(
      "No se recibieron campos validos para actualizar.",
    );
  }

  return normalized;
}

export function createPortalClientUserRecord(
  input: PortalClientUserCreateInput,
): PortalClientUserRecord {
  const now = new Date().toISOString();

  return {
    userId: randomUUID(),
    username: input.username,
    email: input.email,
    fullName: input.fullName,
    passwordHash: hashPortalUserPassword(input.password),
    roleKey: input.roleKey,
    preferredLocale: input.preferredLocale,
    recipientCode: input.recipientCode,
    recipientName: input.recipientName,
    recipientGroupCode: input.recipientGroupCode,
    canViewAll: input.canViewAll,
    modules: input.modules,
    status: input.status,
    twoFactorEnabled: input.twoFactorEnabled,
    requiresPasswordReset: input.requiresPasswordReset,
    refreshTokenVersion: 1,
    lastAccessAt: null,
    createdAt: now,
    updatedAt: now,
    version: Date.now(),
  };
}

export function updatePortalClientUserRecord(
  current: PortalClientUserRecord,
  update: PortalClientUserUpdateInput,
): PortalClientUserRecord {
  const candidate = normalizeRecipientScope({
    roleKey: update.roleKey ?? current.roleKey,
    canViewAll: update.canViewAll ?? current.canViewAll,
    recipientCode:
      update.recipientCode !== undefined
        ? update.recipientCode
        : current.recipientCode,
    recipientName:
      update.recipientName !== undefined
        ? update.recipientName
        : current.recipientName,
    recipientGroupCode:
      update.recipientGroupCode !== undefined
        ? update.recipientGroupCode
        : current.recipientGroupCode,
  });
  const updatedAt = new Date().toISOString();

  return {
    userId: current.userId,
    username: update.username ?? current.username,
    email: update.email ?? current.email,
    fullName: update.fullName ?? current.fullName,
    passwordHash: update.password
      ? hashPortalUserPassword(update.password)
      : current.passwordHash,
    roleKey: candidate.roleKey,
    preferredLocale: update.preferredLocale ?? current.preferredLocale,
    recipientCode: candidate.recipientCode,
    recipientName: candidate.recipientName,
    recipientGroupCode: candidate.recipientGroupCode,
    canViewAll: candidate.canViewAll,
    modules: update.modules ?? current.modules,
    status: update.status ?? current.status,
    twoFactorEnabled: update.twoFactorEnabled ?? current.twoFactorEnabled,
    requiresPasswordReset:
      update.requiresPasswordReset ?? current.requiresPasswordReset,
    refreshTokenVersion:
      update.refreshTokenVersion ?? current.refreshTokenVersion,
    lastAccessAt:
      update.lastAccessAt !== undefined
        ? update.lastAccessAt
        : current.lastAccessAt,
    createdAt: current.createdAt,
    updatedAt,
    version: Date.now(),
  };
}
