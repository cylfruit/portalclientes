export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function getContentSecurityPolicy(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'" + (nonce ? ` 'nonce-${nonce}'` : ""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:1313 https://*.tile.openstreetmap.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join("; ");
}

export function addSecurityHeaders(response: Response): void {
  const headers = response.headers ? new Headers(response.headers) : new Headers();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", getContentSecurityPolicy());
  }
}
