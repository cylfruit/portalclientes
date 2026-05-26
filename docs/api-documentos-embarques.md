# API de documentos de embarque

Esta API expone archivos de documentos asociados a un embarque usando JWT Bearer.

## Autenticacion

Enviar siempre:

```http
Authorization: Bearer TU_TOKEN
```

## Endpoints

### Listar archivos de un embarque

```http
GET /api/documentos/embarque/{embarqueId}/archivos?temporada={temporada}&tipo={tipo}
```

Parametros:

- `embarqueId`: identificador del embarque.
- `temporada`: temporada obligatoria.
- `tipo`: filtro opcional por tipo de documento.

### Ver o descargar un archivo puntual

```http
GET /api/documentos/embarque/{embarqueId}/archivos/{documentoId}?temporada={temporada}&disposition={inline|attachment}
```

Parametros:

- `embarqueId`: identificador del embarque.
- `documentoId`: identificador del documento.
- `temporada`: temporada obligatoria.
- `disposition`: `inline` para intentar abrir en navegador, `attachment` para descarga forzada.

### Ejemplo ver PDF o imagen en navegador

```bash
curl --request GET \
  --url "https://192.168.6.190:1313/api/documentos/embarque/1029/archivos/551?temporada=2425&disposition=inline" \
  --header "Authorization: Bearer TU_TOKEN"
```

### Ejemplo descarga forzada

```bash
curl --request GET \
  --url "https://192.168.6.190:1313/api/documentos/embarque/1029/archivos/551?temporada=2425&disposition=attachment" \
  --header "Authorization: Bearer TU_TOKEN" \
  --output archivo-descargado
```

## Tipos de documento frecuentes

- `PACKING_LIST`
- `FACTURA_PROFORMA` (puede ser `No Aplica`)
- `FACTURA_COMERCIAL`
- `ISF`
- `CERTIFICADO_ORIGEN`
- `COURIER_COMPROBANTE` (puede ser `No Aplica`)
- `DUS`
- `FACTURA_TRIBUTARIA`
- `FULL_SET`
- `TRACKING_DOCUMENT`

## Reglas de acceso

- Usar siempre estas rutas con JWT.
- No integrar contra URLs internas de almacenamiento ni contra rutas estaticas de uploads.
- El archivo se entrega solo si pertenece al `embarqueId`, `temporada` y `documentoId` indicados.
- Si el archivo fisico no existe, la API responde `404`.
- `inline` depende del cliente. PDFs e imagenes suelen abrirse en navegador; Excel y otros formatos pueden descargarse segun el navegador o visor instalado.

## Codigos de respuesta esperados

- `200`: operacion exitosa.
- `400`: parametros invalidos.
- `401`: token faltante, invalido o expirado.
- `404`: embarque, documento o archivo fisico no encontrado.
