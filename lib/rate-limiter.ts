const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const CLEANUP_INTERVAL_MS = 60_000;

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

export function checkLoginRateLimit(
  identifier: string,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);
  const resetAt = now + LOGIN_WINDOW_MS;

  if (!entry || now >= entry.resetAt) {
    store.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS - 1, retryAfterMs: 0 };
  }

  entry.count += 1;
  const allowed = entry.count <= LOGIN_MAX_ATTEMPTS;
  const remaining = Math.max(0, LOGIN_MAX_ATTEMPTS - entry.count);
  const retryAfterMs = Math.max(0, entry.resetAt - now);

  if (!allowed && entry.count === LOGIN_MAX_ATTEMPTS + 1) {
    store.set(identifier, { count: LOGIN_MAX_ATTEMPTS + 1, resetAt: entry.resetAt });
  }

  return { allowed, remaining, retryAfterMs };
}

export function resetLoginRateLimit(identifier: string): void {
  store.delete(identifier);
}
