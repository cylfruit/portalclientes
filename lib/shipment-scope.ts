/**
 * Prefiltro por recibidor para la consulta de embarques.
 *
 * Antes, el portal traía de ClickHouse TODA la temporada (decenas de miles de filas,
 * ~20 MB) y recién después `filterRowsForPortalUser` dejaba solo las del usuario. Este
 * módulo genera una condición SQL que reduce lo que viaja desde la base de datos.
 *
 * Es solo un PREFILTRO: debe ser siempre un superconjunto de lo que acepta
 * `filterRowsForPortalUser` (lib/auth.ts), que sigue aplicándose después y es quien
 * decide. Si ambos se desalinean, el resultado final no cambia: solo se pierde ahorro.
 * La ventana de "los N embarques más recientes" se sigue calculando sobre toda la
 * temporada, así que el conjunto final es idéntico al de antes.
 *
 * Sin imports a propósito, para poder testearlo con `node --test`.
 */

export type RecipientScope = {
  /** true para rol `client`: solo cuenta el código de recibidor, no el de grupo. */
  clientOnly: boolean;
  recipientCode: string | null;
  recipientGroupCode: string | null;
};

export type RecipientScopeUser = {
  canViewAll: boolean;
  roleKey: string;
  recipientCode: string | null;
  recipientGroupCode: string | null;
};

/** null = el usuario ve todo y no se prefiltra. */
export function resolveRecipientScope(
  user: RecipientScopeUser,
): RecipientScope | null {
  if (user.canViewAll) {
    return null;
  }

  return {
    clientOnly: user.roleKey === "client",
    recipientCode: user.recipientCode,
    recipientGroupCode: user.recipientGroupCode,
  };
}

/** Clave estable para cachés. */
export function buildRecipientScopeKey(scope: RecipientScope | null) {
  if (!scope) {
    return "all";
  }

  return JSON.stringify([
    scope.clientOnly,
    scope.recipientCode,
    scope.recipientGroupCode,
  ]);
}

type ScopeSqlColumns = {
  codeColumn: string;
  groupColumn: string;
};

function equalsClause(
  column: string,
  value: string,
  escapeLiteral: (value: string) => string,
) {
  const literal = `'${escapeLiteral(value)}'`;

  // `normalizeRow` hace trim del valor; se aceptan ambas formas por si la base trae
  // espacios de relleno.
  return `(ifNull(${column}, '') = ${literal} OR trim(BOTH ' ' FROM ifNull(${column}, '')) = ${literal})`;
}

/**
 * Devuelve la condición SQL (sin `WHERE`) o `null` si no hay que filtrar. Si el
 * usuario no tiene ningún código con el que coincidir devuelve `"0"` (sin filas), igual
 * que `filterRowsForPortalUser`.
 */
export function buildRecipientScopeCondition(
  scope: RecipientScope | null,
  escapeLiteral: (value: string) => string,
  columns: ScopeSqlColumns,
): string | null {
  if (!scope) {
    return null;
  }

  const clauses: string[] = [];

  if (scope.recipientCode) {
    clauses.push(equalsClause(columns.codeColumn, scope.recipientCode, escapeLiteral));
  }

  if (!scope.clientOnly && scope.recipientGroupCode) {
    clauses.push(
      equalsClause(columns.groupColumn, scope.recipientGroupCode, escapeLiteral),
    );
  }

  return clauses.length > 0 ? `(${clauses.join(" OR ")})` : "0";
}
