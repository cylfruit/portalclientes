const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 20;
const PASSWORD_RECOVERY_MAX_ATTEMPTS = 5;
// Aprobación pública del Full Set: consultas (abrir la página, ver el PDF) y decisiones.
const APPROVAL_VIEW_MAX_ATTEMPTS = 60;
const APPROVAL_DECISION_MAX_ATTEMPTS = 20;
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

function checkRateLimit(
  identifier: string,
  maxAttempts: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);
  const resetAt = now + LOGIN_WINDOW_MS;

  if (!entry || now >= entry.resetAt) {
    store.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  entry.count += 1;
  const allowed = entry.count <= maxAttempts;
  const remaining = Math.max(0, maxAttempts - entry.count);
  const retryAfterMs = Math.max(0, entry.resetAt - now);

  if (!allowed && entry.count === maxAttempts + 1) {
    store.set(identifier, { count: maxAttempts + 1, resetAt: entry.resetAt });
  }

  return { allowed, remaining, retryAfterMs };
}

export function checkLoginRateLimit(identifier: string) {
  return checkRateLimit(identifier, LOGIN_MAX_ATTEMPTS);
}

export function checkPasswordRecoveryRateLimit(identifier: string) {
  return checkRateLimit(identifier, PASSWORD_RECOVERY_MAX_ATTEMPTS);
}

export function checkApprovalViewRateLimit(identifier: string) {
  return checkRateLimit(identifier, APPROVAL_VIEW_MAX_ATTEMPTS);
}

export function checkApprovalDecisionRateLimit(identifier: string) {
  return checkRateLimit(identifier, APPROVAL_DECISION_MAX_ATTEMPTS);
}

export function resetLoginRateLimit(identifier: string): void {
  store.delete(identifier);
}
