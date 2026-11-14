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
  images: {
    // Las imágenes de marca casi nunca cambian: evita regenerar variantes a cada rato.
    minimumCacheTTL: 86_400,
    // Next 16 solo acepta las calidades listadas: 45 para fondos decorativos bajo un
    // overlay oscuro, 75 (por defecto) para el resto.
    qualities: [45, 75],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers,
      },
      // Next sirve /public con `max-age=0` (revalida siempre). Las fuentes llevan la
      // versión en el nombre (montserrat-latin-v1.woff2): si cambian, se renombran.
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Resto de /brand (logos, fondos, TTF de respaldo): un día y revalidación en
      // segundo plano, para poder reemplazarlos sin esperar un año.
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
