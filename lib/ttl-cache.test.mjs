import assert from "node:assert/strict";
import test from "node:test";
import { createTtlCache } from "./ttl-cache.ts";

function clock(start = 1_000) {
  let current = start;
  return { now: () => current, advance: (ms) => (current += ms) };
}

test("reutiliza el valor dentro del TTL y recarga al vencer", async () => {
  const time = clock();
  const cache = createTtlCache({ ttlMs: 100, now: time.now });
  let calls = 0;
  const loader = async () => ++calls;

  assert.equal(await cache.get("k", loader), 1);
  time.advance(99);
  assert.equal(await cache.get("k", loader), 1);
  time.advance(2);
  assert.equal(await cache.get("k", loader), 2);
});

test("deduplica cargas simultáneas de la misma clave", async () => {
  const cache = createTtlCache({ ttlMs: 1_000 });
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return "v";
  };

  const results = await Promise.all([
    cache.get("k", loader),
    cache.get("k", loader),
    cache.get("k", loader),
  ]);

  assert.deepEqual(results, ["v", "v", "v"]);
  assert.equal(calls, 1);
});

test("claves distintas no se mezclan", async () => {
  const cache = createTtlCache({ ttlMs: 1_000 });

  assert.equal(await cache.get("a", async () => "A"), "A");
  assert.equal(await cache.get("b", async () => "B"), "B");
  assert.equal(await cache.get("a", async () => "otro"), "A");
});

test("los errores no se cachean", async () => {
  const cache = createTtlCache({ ttlMs: 1_000 });
  let calls = 0;

  await assert.rejects(
    cache.get("k", async () => {
      calls += 1;
      throw new Error("boom");
    }),
    /boom/,
  );
  assert.equal(await cache.get("k", async () => ++calls), 2);
});

test("ttl <= 0 desactiva el caché", async () => {
  const cache = createTtlCache({ ttlMs: 0 });
  let calls = 0;
  const loader = async () => ++calls;

  assert.equal(await cache.get("k", loader), 1);
  assert.equal(await cache.get("k", loader), 2);
  assert.equal(cache.size(), 0);
});

test("sirve el valor viejo si la recarga falla dentro de staleIfErrorMs", async () => {
  const time = clock();
  const served = [];
  const cache = createTtlCache({
    ttlMs: 100,
    staleIfErrorMs: 1_000,
    now: time.now,
    onStaleServed: (key) => served.push(key),
  });

  assert.equal(await cache.get("k", async () => "viejo"), "viejo");
  time.advance(200);
  assert.equal(
    await cache.get("k", async () => {
      throw new Error("db caída");
    }),
    "viejo",
  );
  assert.deepEqual(served, ["k"]);

  time.advance(5_000);
  await assert.rejects(
    cache.get("k", async () => {
      throw new Error("db caída");
    }),
    /db caída/,
  );
});

test("respeta maxEntries descartando la más antigua", async () => {
  const cache = createTtlCache({ ttlMs: 1_000, maxEntries: 2 });

  await cache.get("a", async () => 1);
  await cache.get("b", async () => 2);
  await cache.get("c", async () => 3);

  assert.equal(cache.size(), 2);
  assert.equal(await cache.get("a", async () => 99), 99);
});
