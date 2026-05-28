# Frontend: uso de rutas de documentos por embarque y temporada

Este documento explica como el frontend debe consumir las rutas seguras de documentos del backend para listar, ver y descargar archivos de un embarque.

## Objetivo

Estas rutas permiten:

- listar archivos disponibles de un embarque por temporada
- filtrar por tipo de documento, por ejemplo `FULL_SET`, `PACKING_LIST`, `ISF`
- abrir un archivo en vista previa
- descargar un archivo

## Rutas a usar

### 1. Login para obtener JWT

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "tu_usuario",
  "password": "tu_password"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

El token a guardar en frontend es `data.token`.

### 2. Listar archivos disponibles

```http
GET /api/documentos/embarque/{embarqueId}/archivos?temporada={temporada}&tipo={tipoOpcional}
Authorization: Bearer <token>
```

Ejemplos:

```http
GET /api/documentos/embarque/1755/archivos?temporada=T7
GET /api/documentos/embarque/1755/archivos?temporada=T7&tipo=FULL_SET
GET /api/documentos/embarque/1755/archivos?temporada=T7&tipo=PACKING_LIST
```

### 3. Ver o descargar un archivo

```http
GET /api/documentos/embarque/{embarqueId}/archivos/{documentoId}?temporada={temporada}&disposition=inline
Authorization: Bearer <token>
```

```http
GET /api/documentos/embarque/{embarqueId}/archivos/{documentoId}?temporada={temporada}&disposition=attachment
Authorization: Bearer <token>
```

Notas:

- `inline` intenta abrir el archivo para visualizacion.
- `attachment` fuerza descarga desde el backend.
- ambas rutas requieren `Authorization: Bearer <token>`.

## Regla importante para frontend

Los campos `view_url` y `download_url` que devuelve el backend son rutas relativas y protegidas por JWT.

Eso significa que el frontend **no** debe usar directamente:

```html
<a href="/api/documentos/...">Ver</a>
```

ni tampoco un `window.open(url)` sin headers, porque el navegador no agregara automaticamente el header `Authorization`.

La forma correcta es:

1. pedir el archivo con `fetch` o `axios`
2. enviar el header `Authorization`
3. recibir el archivo como `blob`
4. crear un `object URL` para abrirlo o descargarlo

## Flujo recomendado en frontend

1. hacer login y guardar el token JWT
2. listar documentos del embarque y temporada
3. renderizar solo los documentos que vienen en `data`
4. usar `view_url` para preview con `fetch + blob`
5. usar `download_url` para descarga con `fetch + blob`

## Como interpretar la respuesta del listado

Respuesta ejemplo:

```json
{
  "success": true,
  "embarque": {
    "id": 1755,
    "CodEmbarque": 1755,
    "CodigoTemporada": "T7",
    "FECHA_DESP": "2026-01-29",
    "Destino": "LOS ANGELES",
    "PAIS": "ESTADOS UNIDOS"
  },
  "filtros": {
    "temporada": "T7",
    "tipo": "FULL_SET"
  },
  "resumen": {
    "total_documentos": 1,
    "archivos_disponibles": 1,
    "archivos_no_disponibles": 0
  },
  "data": [
    {
      "documento_id": 10312,
      "embarque_id": 1755,
      "temporada": "T7",
      "tipo": "FULL_SET",
      "estado": "APROBADO",
      "original_name": "Fullset_1755_2026-02-05T20-30-10-703Z.pdf",
      "mime_type": "application/pdf",
      "size": "2340577",
      "created_at": "2026-02-05T17:30:10.716Z",
      "updated_at": "2026-03-11T16:20:19.496Z",
      "view_url": "/api/documentos/embarque/1755/archivos/10312?temporada=T7&disposition=inline",
      "download_url": "/api/documentos/embarque/1755/archivos/10312?temporada=T7&disposition=attachment"
    }
  ]
}
```

### Lectura recomendada de la respuesta

- `resumen.total_documentos`: total de registros encontrados para ese filtro
- `resumen.archivos_disponibles`: cuantos tienen archivo fisico accesible
- `resumen.archivos_no_disponibles`: cuantos existen como registro, pero no se pudieron servir como archivo
- `data`: solo contiene archivos realmente disponibles para ver o descargar

### Reglas de UI sugeridas

- Si `data.length > 0`, mostrar botones `Ver` y `Descargar`.
- Si `data.length === 0` y `resumen.archivos_no_disponibles > 0`, mostrar un mensaje como `Documento registrado, pero archivo no disponible`.
- Si `resumen.total_documentos === 0`, mostrar `No existe documento para este embarque/temporada/tipo`.

## Ejemplo en TypeScript con fetch

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type LoginResponse = {
  success: boolean;
  data: {
    token: string;
  };
};

type DocumentoArchivo = {
  documento_id: number;
  embarque_id: number;
  temporada: string;
  tipo: string;
  estado: string;
  original_name: string;
  mime_type: string;
  size: string | number;
  created_at: string;
  updated_at: string;
  view_url: string;
  download_url: string;
};

type ListadoDocumentosResponse = {
  success: boolean;
  resumen: {
    total_documentos: number;
    archivos_disponibles: number;
    archivos_no_disponibles: number;
  };
  data: DocumentoArchivo[];
};

export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("No fue posible iniciar sesion");
  }

  const json = (await response.json()) as LoginResponse;
  return json.data.token;
}

export async function listarDocumentosEmbarque(params: {
  embarqueId: number | string;
  temporada: string;
  tipo?: string;
  token: string;
}) {
  const url = new URL(
    `/api/documentos/embarque/${params.embarqueId}/archivos`,
    API_BASE_URL,
  );

  url.searchParams.set("temporada", params.temporada);

  if (params.tipo) {
    url.searchParams.set("tipo", params.tipo);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error listando documentos: ${response.status}`);
  }

  return (await response.json()) as ListadoDocumentosResponse;
}
```

## Ejemplo para preview de archivo

```ts
async function fetchDocumentoBlob(relativeUrl: string, token: string) {
  const url = new URL(relativeUrl, API_BASE_URL);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error obteniendo archivo: ${response.status}`);
  }

  const blob = await response.blob();

  return {
    blob,
    contentType: response.headers.get("Content-Type"),
    contentDisposition: response.headers.get("Content-Disposition"),
  };
}

export async function abrirDocumentoEnNuevaPestana(
  relativeUrl: string,
  token: string,
) {
  const { blob } = await fetchDocumentoBlob(relativeUrl, token);
  const objectUrl = URL.createObjectURL(blob);

  window.open(objectUrl, "_blank", "noopener,noreferrer");

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60000);
}
```

Uso:

```ts
await abrirDocumentoEnNuevaPestana(documento.view_url, token);
```

## Ejemplo para descarga

```ts
export async function descargarDocumento(
  relativeUrl: string,
  token: string,
  fileName: string,
) {
  const { blob } = await fetchDocumentoBlob(relativeUrl, token);
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60000);
}
```

Uso:

```ts
await descargarDocumento(
  documento.download_url,
  token,
  documento.original_name,
);
```

## Ejemplo de uso completo para FULL_SET

```ts
const respuesta = await listarDocumentosEmbarque({
  embarqueId: 1755,
  temporada: "T7",
  tipo: "FULL_SET",
  token,
});

if (respuesta.data.length > 0) {
  const fullset = respuesta.data[0];

  // Preview
  await abrirDocumentoEnNuevaPestana(fullset.view_url, token);

  // Descarga
  // await descargarDocumento(fullset.download_url, token, fullset.original_name);
} else if (respuesta.resumen.archivos_no_disponibles > 0) {
  console.warn(
    "El FULL_SET existe, pero no hay archivo disponible para abrir o descargar",
  );
} else {
  console.warn("No existe FULL_SET para este embarque y temporada");
}
```

## Codigos de respuesta a manejar en frontend

- `200`: operacion exitosa
- `400`: parametros invalidos
- `401`: token faltante, invalido o expirado
- `404`: embarque, documento o archivo no encontrado

## Recomendaciones practicas

- guardar el token en el store de autenticacion del frontend
- centralizar `fetch` o `axios` con un wrapper que agregue `Authorization`
- no hardcodear las URLs; usar `view_url` y `download_url` devueltas por backend
- no renderizar links directos sin header bearer
- para preview de PDF o imagen usar `blob + URL.createObjectURL(...)`
- para descarga usar `blob + anchor.download`
- usar `resumen.archivos_no_disponibles` para mostrar mensajes claros en la UI

## Tipos de documento frecuentes

- `FULL_SET`
- `PACKING_LIST`
- `FACTURA_COMERCIAL`
- `FACTURA_PROFORMA`
- `FACTURA_TRIBUTARIA`
- `INSTRUCTIVO_EMBARQUE`
- `ISF`
- `BL_AWB`
- `COURIER_COMPROBANTE`
- `DUS`
- `DUS_LEGALIZADA`
- `TRACKING_DOCUMENT`

## Resumen corto para implementacion

Si el frontend necesita mostrar documentos por embarque:

1. pedir JWT con `POST /api/auth/login`
2. llamar `GET /api/documentos/embarque/:id/archivos?temporada=T7&tipo=FULL_SET`
3. tomar el primer item de `data`
4. usar `view_url` o `download_url` con `fetch` autenticado
5. abrir o descargar usando `blob`
