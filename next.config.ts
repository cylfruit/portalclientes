import type { NextConfig } from "next";
import {
  SECURITY_HEADERS,
  getContentSecurityPolicy,
} from "./lib/security-headers";

const headers = Object.entries({
  ...SECURITY_HEADERS,
  "Content-Security-Policy": getContentSecurityPolicy(),
}).map(([key, value]) => ({ key, value }));

const nextConfig: NextConfig = {
  // react-leaflet v5 es incompatible con React Strict Mode:
  // MapContainer crea el mapa en un ref callback con guard !mapInstanceRef.current,
  // pero el cleanup de Strict Mode destruye el mapa sin limpiar ese ref.
  // En el remount, TileLayer intenta usar el mapa destruido → "appendChild undefined".
  reactStrictMode: false,
  output: "standalone",
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
