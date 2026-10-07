import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_APPROVER_NAME_LENGTH,
  MAX_COMMENT_LENGTH,
  buildApprover,
  getClientIp,
  isCommentAcceptableFor,
  isValidApprovalToken,
  normalizeApproverEmail,
  normalizeApproverName,
  normalizeComment,
  parseApprovalTokenFromHash,
  parseDecision,
  truncateUserAgent,
} from "./fullset-approval-input.ts";

const TOKEN = "Ab3_-".repeat(8) + "xyz"; // 43 caracteres base64url

test("el token de 43 caracteres base64url es valido", () => {
  assert.equal(TOKEN.length, 43);
  assert.equal(isValidApprovalToken(TOKEN), true);
});

test("tokens mal formados se rechazan", () => {
  for (const bad of [
    "",
    "corto",
    TOKEN + "a",
    TOKEN.slice(0, 42) + "!",
    TOKEN.slice(0, 42) + " ",
    "<script>".padEnd(43, "a"),
    null,
    undefined,
    42,
    {},
  ]) {
    assert.equal(isValidApprovalToken(bad), false, String(bad));
  }
});

test("el token se lee del fragmento, no de la query", () => {
  assert.equal(parseApprovalTokenFromHash(`#token=${TOKEN}`), TOKEN);
  assert.equal(parseApprovalTokenFromHash(`token=${TOKEN}`), TOKEN);
  assert.equal(parseApprovalTokenFromHash(`#otro=1&token=${TOKEN}`), TOKEN);
  assert.equal(parseApprovalTokenFromHash(""), null);
  assert.equal(parseApprovalTokenFromHash("#token=corto"), null);
  assert.equal(parseApprovalTokenFromHash(`#t=${TOKEN}`), null);
});

test("el nombre se limpia: espacios, controles y largo", () => {
  assert.equal(normalizeApproverName("  Ana   Perez \n"), "Ana Perez");
  assert.equal(normalizeApproverName("Ana\u0000\u0007 Perez"), "Ana Perez");
  // Marcas de direccion de texto que sirven para disfrazar un nombre.
  assert.equal(normalizeApproverName("‮Ana"), "Ana");
  assert.equal(
    normalizeApproverName("a".repeat(500)).length,
    MAX_APPROVER_NAME_LENGTH,
  );
  assert.equal(normalizeApproverName(undefined), "");
  assert.equal(normalizeApproverName(42), "");
});

test("el correo es opcional: lo invalido se descarta sin fallar", () => {
  assert.equal(normalizeApproverEmail(" Ana@Cliente.COM "), "ana@cliente.com");
  assert.equal(normalizeApproverEmail(""), null);
  assert.equal(normalizeApproverEmail("no-es-correo"), null);
  assert.equal(normalizeApproverEmail("a@b"), null);
  assert.equal(normalizeApproverEmail("a b@c.com"), null);
  assert.equal(normalizeApproverEmail('x"<script>@c.com'), null);
  assert.equal(normalizeApproverEmail("a@c.com, b@c.com"), null);
  assert.equal(normalizeApproverEmail(`${"a".repeat(260)}@c.com`), null);
  assert.equal(normalizeApproverEmail(null), null);
});

test("el comentario se normaliza y se acota", () => {
  assert.equal(normalizeComment("  falta el BL  "), "falta el BL");
  assert.equal(normalizeComment("linea1\r\nlinea2"), "linea1\nlinea2");
  assert.equal(normalizeComment("a\n\n\n\n\nb"), "a\n\nb");
  assert.equal(normalizeComment("x\u0000y"), "xy");
  assert.equal(normalizeComment("a".repeat(5000)).length, MAX_COMMENT_LENGTH);
  assert.equal(normalizeComment(undefined), "");
  assert.equal(normalizeComment({}), "");
});

test("solo existen dos decisiones", () => {
  assert.equal(parseDecision("APROBADO"), "APROBADO");
  assert.equal(parseDecision("RECHAZADO"), "RECHAZADO");
  for (const bad of ["aprobado", "PENDIENTE", "", null, undefined, 1]) {
    assert.equal(parseDecision(bad), null);
  }
});

test("rechazar exige un motivo real y aprobar no pide comentario", () => {
  assert.equal(isCommentAcceptableFor("APROBADO", ""), true);
  assert.equal(isCommentAcceptableFor("RECHAZADO", ""), false);
  assert.equal(isCommentAcceptableFor("RECHAZADO", "   "), false);
  assert.equal(isCommentAcceptableFor("RECHAZADO", "no"), false);
  assert.equal(isCommentAcceptableFor("RECHAZADO", "falta BL"), true);
});

test("la IP viene del primer valor de x-forwarded-for y solo si parece una IP", () => {
  const headers = (map) => ({ get: (name) => map[name] ?? null });

  assert.equal(
    getClientIp(headers({ "x-forwarded-for": "200.1.2.3, 10.0.0.1" })),
    "200.1.2.3",
  );
  assert.equal(
    getClientIp(headers({ "x-real-ip": "2001:db8::1" })),
    "2001:db8::1",
  );
  assert.equal(getClientIp(headers({})), "unknown");
  assert.equal(
    getClientIp(headers({ "x-forwarded-for": "<script>alert(1)</script>" })),
    "unknown",
  );
});

test("el user-agent se acota y se limpia", () => {
  assert.equal(truncateUserAgent("a".repeat(1000)).length, 300);
  assert.equal(truncateUserAgent("x\u0000y"), "xy");
  assert.equal(truncateUserAgent(null), "");
});

test("buildApprover junta nombre y correo normalizados", () => {
  assert.deepEqual(buildApprover({ name: "  Ana ", email: "ANA@c.com" }), {
    nombre: "Ana",
    email: "ana@c.com",
  });
  assert.deepEqual(buildApprover({ name: "Ana", email: "mal" }), {
    nombre: "Ana",
    email: null,
  });
});
