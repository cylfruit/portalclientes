export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function getContentSecurityPolicy(nonce?: string): string {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const connectSources = [
    "'self'",
    "https://*.tile.openstreetmap.org",
    "https://*.basemaps.cartocdn.com",
  ];

  if (isDevelopment) {
    connectSources.push("http://localhost:1313");
  }

  if (!isDevelopment) {
    connectSources.push("https://cloudflareinsights.com");
  }

  const scriptSources = ["'self'"];

  if (nonce) {
    scriptSources.push(`'nonce-${nonce}'`);
  }

  if (isDevelopment) {
    scriptSources.push("'unsafe-inline'", "'unsafe-eval'");
  }

  if (!isDevelopment) {
    scriptSources.push("https://static.cloudflareinsights.com");
  }

  const styleSources = ["'self'"];
  const styleElementSources = ["'self'"];

  if (nonce) {
    styleElementSources.push(`'nonce-${nonce}'`);
  }

  if (isDevelopment) {
    styleSources.push("'unsafe-inline'");
    styleElementSources.push("'unsafe-inline'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src ${styleSources.join(" ")}`,
    `style-src-elem ${styleElementSources.join(" ")}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
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
