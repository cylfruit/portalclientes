import assert from "node:assert/strict";
import test from "node:test";
import {
  isRejectedFullSet,
  resolveFullSetApproval,
  shouldExposeCustomerDocument,
} from "./shipment-documents-visibility.ts";

const fullSet = (overrides = {}) => ({
  tipo: "FULL_SET",
  estado: "APROBADO",
  estado_aprobacion_cliente: "PENDIENTE",
  es_ultimo_full_set: true,
  requiere_aprobacion_cliente: true,
  fecha_aprobacion_cliente: null,
  ...overrides,
});

test("un Full Set pendiente o aprobado se muestra", () => {
  assert.equal(shouldExposeCustomerDocument(fullSet()), true);
  assert.equal(
    shouldExposeCustomerDocument(
      fullSet({ estado_aprobacion_cliente: "APROBADO" }),
    ),
    true,
  );
  assert.equal(
    shouldExposeCustomerDocument(fullSet({ estado_aprobacion_cliente: null })),
    true,
  );
});

test("un Full Set rechazado por el cliente NO se muestra", () => {
  assert.equal(
    shouldExposeCustomerDocument(
      fullSet({ estado_aprobacion_cliente: "RECHAZADO" }),
    ),
    false,
  );
  assert.equal(
    shouldExposeCustomerDocument(
      fullSet({ estado_aprobacion_cliente: " rechazado " }),
    ),
    false,
  );
  assert.equal(
    isRejectedFullSet(fullSet({ estado_aprobacion_cliente: "RECHAZADO" })),
    true,
  );
});

test("el rechazo solo oculta el Full Set, no otros tipos de documento", () => {
  assert.equal(
    shouldExposeCustomerDocument({
      tipo: "PACKING_LIST",
      estado: "APROBADO",
      estado_aprobacion_cliente: "RECHAZADO",
    }),
    true,
  );
});

test("las reglas anteriores siguen vigentes: eliminados y facturas tributarias ocultos", () => {
  assert.equal(
    shouldExposeCustomerDocument(fullSet({ estado: "ELIMINADO" })),
    false,
  );
  assert.equal(
    shouldExposeCustomerDocument({
      tipo: "FACTURA_TRIBUTARIA",
      estado: "APROBADO",
    }),
    false,
  );
  assert.equal(
    shouldExposeCustomerDocument({ tipo: "PACKING_LIST", estado: "APROBADO" }),
    true,
  );
});

test("solo el Full Set tiene estado de aprobacion", () => {
  assert.equal(resolveFullSetApproval({ tipo: "PACKING_LIST" }), null);
  assert.equal(resolveFullSetApproval({ tipo: "FACTURA_COMERCIAL" }), null);
});

test("pendiente y ultima version: el cliente puede responder", () => {
  assert.deepEqual(resolveFullSetApproval(fullSet()), {
    status: "PENDIENTE",
    canDecide: true,
    decidedAt: null,
  });
});

test("una version anterior pendiente no se puede responder", () => {
  assert.equal(
    resolveFullSetApproval(fullSet({ es_ultimo_full_set: false }))?.canDecide,
    false,
  );
  // Sin el dato (backend antiguo) tampoco: ante la duda no se ofrece responder.
  assert.equal(
    resolveFullSetApproval(fullSet({ es_ultimo_full_set: undefined }))
      ?.canDecide,
    false,
  );
});

test("aprobado muestra la insignia con su fecha y no admite nueva respuesta", () => {
  assert.deepEqual(
    resolveFullSetApproval(
      fullSet({
        estado_aprobacion_cliente: "APROBADO",
        fecha_aprobacion_cliente: "2026-10-07T12:00:00.000Z",
      }),
    ),
    {
      status: "APROBADO",
      canDecide: false,
      decidedAt: "2026-10-07T12:00:00.000Z",
    },
  );
});

test("no necesita envio no pide aprobacion", () => {
  assert.deepEqual(
    resolveFullSetApproval(
      fullSet({ estado_aprobacion_cliente: "NO_NECESITA_ENVIO" }),
    ),
    { status: "NO_REQUIERE", canDecide: false, decidedAt: null },
  );
});

test("si el Full Set no requiere aprobacion (otro mercado o aereo) no se ofrece responderlo", () => {
  for (const requiere of [false, null, undefined]) {
    assert.deepEqual(
      resolveFullSetApproval(
        fullSet({ requiere_aprobacion_cliente: requiere }),
      ),
      { status: "NO_REQUIERE", canDecide: false, decidedAt: null },
    );
  }
});

test("un Full Set aprobado por defecto se muestra como aprobado aunque no requiriera aprobacion", () => {
  assert.equal(
    resolveFullSetApproval(
      fullSet({
        estado_aprobacion_cliente: "APROBADO",
        requiere_aprobacion_cliente: false,
      }),
    )?.status,
    "APROBADO",
  );
});

test("un Full Set rechazado sigue oculto y uno pendiente de otro mercado sigue visible", () => {
  assert.equal(
    shouldExposeCustomerDocument(
      fullSet({
        estado_aprobacion_cliente: "RECHAZADO",
        requiere_aprobacion_cliente: false,
      }),
    ),
    false,
  );
  assert.equal(
    shouldExposeCustomerDocument(
      fullSet({ requiere_aprobacion_cliente: false }),
    ),
    true,
  );
});
