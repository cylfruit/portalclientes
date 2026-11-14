/**
 * Caché en memoria con TTL para el servidor del portal.
 *
 * - Deduplica cargas simultáneas de la misma clave (varios usuarios pidiendo la
 *   misma temporada a la vez disparan UNA sola consulta).
 * - Los errores nunca se cachean.
 * - `staleIfErrorMs`: si la recarga falla, se sirve el último valor conocido mientras
 *   no tenga más de esa antigüedad (evita pantallas de error por un tropiezo breve de
 *   la base de datos).
 * - `ttlMs <= 0` desactiva el caché por completo (cada llamada ejecuta el loader).
 *
 * Es estado de proceso: con varias instancias del contenedor cada una tiene el suyo.
 * Sin imports a propósito, para poder testearlo con `node --test`.
 */

export type TtlCacheOptions = {
  ttlMs: number;
  maxEntries?: number;
  staleIfErrorMs?: number;
  now?: () => number;
  onStaleServed?: (key: string, error: unknown) => void;
};

type Entry<T> = { value: T; storedAt: number };

export type TtlCache<T> = {
  get(key: string, loader: () => Promise<T>): Promise<T>;
  clear(): void;
  size(): number;
};

export function createTtlCache<T>(options: TtlCacheOptions): TtlCache<T> {
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 0;
  const maxEntries = Math.max(1, options.maxEntries ?? 32);
  const staleIfErrorMs = Math.max(0, options.staleIfErrorMs ?? 0);
  const now = options.now ?? Date.now;

  const entries = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();

  function store(key: string, value: T) {
    // Reinsertar para que el orden del Map sea "más antiguo primero".
    entries.delete(key);
    entries.set(key, { value, storedAt: now() });

    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      entries.delete(oldestKey);
    }
  }

  return {
    get(key, loader) {
      if (ttlMs <= 0) {
        return loader();
      }

      const cached = entries.get(key);

      if (cached && now() - cached.storedAt < ttlMs) {
        return Promise.resolve(cached.value);
      }

      const pending = inflight.get(key);

      if (pending) {
        return pending;
      }

      const load = (async () => {
        try {
          const value = await loader();
          store(key, value);
          return value;
        } catch (error) {
          if (cached && now() - cached.storedAt < staleIfErrorMs) {
            options.onStaleServed?.(key, error);
            return cached.value;
          }

          throw error;
        } finally {
          inflight.delete(key);
        }
      })();

      inflight.set(key, load);
      return load;
    },
    clear() {
      entries.clear();
      inflight.clear();
    },
    size() {
      return entries.size;
    },
  };
}
