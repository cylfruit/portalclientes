import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-leaflet v5 es incompatible con React Strict Mode:
  // MapContainer crea el mapa en un ref callback con guard !mapInstanceRef.current,
  // pero el cleanup de Strict Mode destruye el mapa sin limpiar ese ref.
  // En el remount, TileLayer intenta usar el mapa destruido → "appendChild undefined".
  reactStrictMode: false,
  output: "standalone",
};

export default nextConfig;
