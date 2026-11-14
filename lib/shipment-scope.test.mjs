import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecipientScopeCondition,
  buildRecipientScopeKey,
  resolveRecipientScope,
} from "./shipment-scope.ts";

const BS = String.fromCharCode(92);
const escape = (value) =>
  value.replaceAll(BS, BS + BS).replaceAll("'", BS + "'");
const columns = { codeColumn: "t.CodRecibidor", groupColumn: "t.CodigoGrupoRecibidor" };
const user = (overrides) => ({
  canViewAll: false,
  roleKey: "receiver",
  recipientCode: null,
  recipientGroupCode: null,
  ...overrides,
});

test("quien ve todo no se prefiltra", () => {
  const scope = resolveRecipientScope(user({ canViewAll: true, recipientCode: "1" }));

  assert.equal(scope, null);
  assert.equal(buildRecipientScopeCondition(scope, escape, columns), null);
  assert.equal(buildRecipientScopeKey(scope), "all");
});

test("rol client filtra solo por código, aunque tenga grupo", () => {
  const scope = resolveRecipientScope(
    user({ roleKey: "client", recipientCode: "448", recipientGroupCode: "G1" }),
  );
  const condition = buildRecipientScopeCondition(scope, escape, columns);

  assert.match(condition, /t\.CodRecibidor/);
  assert.match(condition, /'448'/);
  assert.doesNotMatch(condition, /CodigoGrupoRecibidor/);
  assert.doesNotMatch(condition, /G1/);
});

test("otros roles filtran por código O grupo", () => {
  const scope = resolveRecipientScope(
    user({ recipientCode: "448", recipientGroupCode: "G1" }),
  );
  const condition = buildRecipientScopeCondition(scope, escape, columns);

  assert.match(condition, /'448'/);
  assert.match(condition, /'G1'/);
  assert.match(condition, / OR /);
});

test("sin códigos no devuelve filas (igual que el filtro de la app)", () => {
  const scope = resolveRecipientScope(user({ roleKey: "client" }));

  assert.equal(buildRecipientScopeCondition(scope, escape, columns), "0");
});

test("escapa comillas y barras para evitar inyección SQL", () => {
  const scope = resolveRecipientScope(
    user({ recipientCode: "x' OR 1=1 --", recipientGroupCode: `a${BS}b` }),
  );
  const condition = buildRecipientScopeCondition(scope, escape, columns);

  // Comilla simple -> \' y barra invertida -> \\ dentro del literal SQL.
  assert.ok(condition.includes(String.raw`'x\' OR 1=1 --'`));
  assert.ok(condition.includes(String.raw`'a\\b'`));
});

test("la clave de caché distingue alcances", () => {
  const a = resolveRecipientScope(user({ recipientCode: "1" }));
  const b = resolveRecipientScope(user({ recipientCode: "2" }));
  const c = resolveRecipientScope(user({ roleKey: "client", recipientCode: "1" }));

  assert.notEqual(buildRecipientScopeKey(a), buildRecipientScopeKey(b));
  assert.notEqual(buildRecipientScopeKey(a), buildRecipientScopeKey(c));
});
