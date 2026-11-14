# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Portal privado de clientes/recibidores de CYL Fruit: embarques, tracking marítimo, documentos y aprobación del Full Set. Next.js 16 (App Router) + React 19 + Tailwind 4, TypeScript estricto, alias `@/*` → raíz del repo. UI y mensajes en español (con soporte `es`/`en` por usuario). Las reglas generales (git, DB, Docker, seguridad) están en el CLAUDE.md global.

## Comandos

Package manager: **pnpm** (hay `pnpm-lock.yaml`; no mezclar lockfiles).

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` (`eslint`, config plana con `eslint-config-next`)
- `pnpm test` — `node --test lib/*.test.mjs`. Los tests son `.mjs` que importan los `.ts` de `lib/` directamente (type-stripping nativo de Node, sin Jest/Vitest/bundler). Por eso los módulos de `lib/` con tests (`tracking-eligibility`, `shipment-documents-visibility`, `fullset-approval-input`) no deben tener imports en runtime que Node no resuelva: el alias `@/` solo es seguro con `import type` (se borra al compilar).
- Un solo archivo: `node --test lib/tracking-eligibility.test.mjs`; un solo caso: añadir `--test-name-pattern="texto"`.
- No existe script de typecheck; `pnpm build` ejecuta `tsc` vía Next.

Variables de entorno: copiar `.env.example` a `.env.local`. Se requieren `AUTH_JWT_SECRET` (≥32 chars; sin él `lib/auth-session.ts` lanza error), las `CLICKHOUSE_*`, `DOCUMENTS_API_*` y `AUTH_PUBLIC_ORIGIN` (obligatorio en producción para redirects seguros). `RESEND_*` se usa solo en `lib/password-reset.ts` (correo de recuperación de contraseña).

## Arquitectura

**No hay backend propio ni ORM.** Todo corre dentro de esta app Next.js y habla con dos sistemas externos, siempre desde el servidor:

1. **ClickHouse** (`lib/clickhouse.ts`, ~1400 líneas, vía HTTP): fuente de embarques (vista `CLICKHOUSE_VIEW`), temporadas, tracking de contenedores/naves, y también las tablas propias del portal (`PortalClientUsers`, `PortalPasswordResetTokens`; esquema en `portal-client-auth-schema.sql`). Las tablas de usuarios son `ReplacingMergeTree(Version)`: las lecturas usan `FINAL` y "actualizar" es insertar una fila nueva con `Version` mayor (`upsert*`). `lib/portal-data.ts` define los tipos de dominio (`EmbarqueRow`, etc.) y agrupa filas planas en embarques (`buildShipmentsFromRows`).
2. **API de documentos de Comex** (`DOCUMENTS_API_*`, ver `docs/api-documentos-embarques.md`): `lib/shipment-documents-api.ts` hace login con una cuenta de servicio, cachea el JWT (`DOCUMENTS_API_TOKEN_TTL_MS`) y expone listar/ver/descargar. El navegador nunca habla con ese backend: pasa por `app/api/embarques/[shipmentId]/documentos/...`. `lib/shipment-documents-visibility.ts` decide qué tipos de documento ve el cliente (whitelist: Packing List, Factura Comercial, Full Set, ISF).

### Rendimiento (no deshacer sin medir)

- **Los embarques viajan agrupados.** La temporada completa son ~16.500 filas (una por pallet, ~20 MB de JSON). `app/page.tsx` y `GET /api/embarques?format=summary` agrupan con `buildShipmentsFromRows` en el servidor y el dashboard recibe `ShipmentSummary[]`, no filas. El navegador reevalúa solo el estado con su reloj (`refreshShipmentStatus`). Sin `format=summary` la API devuelve `rows` como antes.
- **Prefiltro por recibidor en SQL** (`lib/shipment-scope.ts`, `scope` en `fetchEmbarqueRowsWithSeasonFallback`): ClickHouse solo envía las filas del usuario. Es un *prefiltro*: `filterRowsForPortalUser` se sigue aplicando después y es quien decide. La ventana de los 500 embarques se calcula antes del filtro, y el fallback de temporada se decide con una consulta de existencia global, así el resultado es idéntico al de filtrar en la app. Si cambias `filterRowsForPortalUser`, actualiza `buildRecipientScopeCondition`.
- **Cachés en memoria** (`lib/ttl-cache.ts`: TTL, deduplicación de cargas simultáneas, sirve el último valor si la BD falla): embarques 30 s, temporadas 5 min, tracking 60 s (`CLICKHOUSE_*_CACHE_TTL_MS`, 0 = off). Las búsquedas libres no se cachean. Es por proceso.
- Las consultas JSON usan `enable_http_compression=1` (la temporada baja de ~20 MB a ~350 KB por la red).
- **Mapa**: `components/lazy-tracking-map.tsx` lo carga al acercarse al viewport; con "ahorro de datos" o 2G pide un clic. Su CSS (leaflet/maplibre) se importa en `tracking-map.tsx`, no en el layout.
- **Estáticos**: fuentes woff2 recortadas a latín en `public/fonts/` (caché inmutable: si cambias una, renómbrala). `/brand/*` cachea 1 día. Fondos decorativos usan `quality={45}` (debe estar en `images.qualities` de `next.config.ts`).

### Auth y autorización (`proxy.ts` + `lib/auth-session.ts` + `lib/auth.ts`)

- `proxy.ts` (el middleware de Next 16, ya no `middleware.ts`) corre en todas las rutas: inyecta CSP con nonce (solo en producción) y `SECURITY_HEADERS` de `lib/security-headers.ts`, normaliza trailing slash, y exige sesión salvo en las rutas listadas en `isPublicPath`. Las rutas de admin (`/usuarios`, `/api/portal-users`) exigen rol admin. **Una ruta nueva pública o de admin debe añadirse a esas funciones.**
- Sesión = JWT HS256 (`jose`) en cookie `PortalClientes.Session`; CSRF por doble cookie `PortalClientes.Csrf`. Las rutas API que mutan deben validar CSRF (`requireValidCsrfToken`); para sesión usar `requireAuthenticatedApiUser` / `requireAdminApiUser`, y en páginas `requireAuthenticatedPortalUser` / `requireAdminPortalUser`.
- Roles: `client | receiver | receiver_admin | admin | superuser`. **El filtrado autoritativo de datos por cliente se hace en la app** (la query solo prefiltra, ver Rendimiento): el resultado se pasa siempre por `filterRowsForPortalUser` (por `recipientCode` / `recipientGroupCode` / `canViewAll`). Cualquier endpoint o página nuevos que expongan embarques deben aplicarlo.
- `lib/rate-limiter.ts` es un `Map` en memoria (válido solo con una instancia del contenedor).

### Aprobación del Full Set (flujo público sin sesión)

El cliente llega desde un correo a `/aprobacion-fullset` con un token de 256 bits en el **fragmento** (`#`) de la URL. No hay sesión: lo protegen el token, CSRF, rate limit y que el backend de Comex revalida todo. Reglas que hay que conservar:

- El token viaja siempre en el **body** (nunca URL/query) para no quedar en logs; las respuestas llevan `no-store` y `Referrer-Policy: no-referrer`.
- Piezas comunes en `lib/fullset-approval-http.ts` (lectura acotada del body, CSRF, rate limit, traducción de errores); validación de input e imágenes (firma PNG/JPEG/WebP, límites de tamaño/cantidad) en `lib/fullset-approval-input.ts`; cliente del backend en `lib/fullset-approval-api.ts`.
- Solo los embarques de mercado **China** y transporte no aéreo requieren respuesta (`requiere_aprobacion_cliente`); el resto queda aprobado por defecto. También se puede aprobar desde el portal con sesión (`/api/embarques/.../aprobacion`, `components/fullset-portal-approval.tsx`).

### Frontend

Páginas en `app/` (`force-dynamic`, con `PortalShell` de `components/`); el tracking usa Leaflet/MapLibre (`components/tracking-map.tsx`; `reactStrictMode: false` es **intencional** por incompatibilidad con react-leaflet v5, ver `next.config.ts`). La lógica de elegibilidad de tracking está en `lib/tracking-eligibility.ts`. Paleta de colores: `docs/PALETA-COLORES-WEB.md`.

## Deploy

`next.config.ts` usa `output: "standalone"`; el `Dockerfile` (node 22-alpine, puerto 4300) es multi-stage con pnpm. Un push a `master`/`main` dispara `.github/workflows/cd-docker.yml`: construye la imagen a GHCR y un runner self-hosted la reinicia con `TZ=America/Santiago`, el `.env` desde el secret `APP_ENV_FILE` y labels de Traefik (`clients.cylfruit.cl`). Es decir, **mergear a `master` despliega a producción**.

`.agents/skills/` contiene skills de terceros (React/Next/Tailwind, etc.) registradas en `skills-lock.json`; no son código del proyecto.
