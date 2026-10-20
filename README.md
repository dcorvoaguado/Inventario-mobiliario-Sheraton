# Inventario de mobiliario · Sheraton

Aplicación web en español para registrar mobiliario, ubicación, categoría, unidades, estado de conservación y notas. Incluye edición, eliminación con confirmación, búsqueda, filtros, resumen y exportación CSV de los registros filtrados.

## Desarrollo

Requiere Node.js 22.12 o superior (validado con Node 24) y npm.

```sh
npm ci
npm run dev
```

## Validación

```sh
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/sheraton-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/sheraton-browsers npm test
```

En este entorno se utiliza Chromium preinstalado: `CHROMIUM_PATH=/usr/bin/chromium npm test`, sin descargar otro navegador.

`npm run preview` sirve la compilación de `dist`. Las pruebas inician su propio servidor de desarrollo.

## Datos y alcance

El inventario comienza vacío. Los datos se guardan en localStorage del navegador y origen actuales. No hay servidor, cuentas, sincronización entre dispositivos ni copias automáticas. Exporta periódicamente el CSV antes de borrar datos del navegador; esta versión no incorpora importación. No debe utilizarse como registro compartido o única copia del inventario real. Si el almacenamiento no puede leerse, se bloquean las escrituras para conservarlo.

La aplicación es una base inicial independiente, sin recursos oficiales de marca ni integraciones con sistemas del hotel. Para uso compartido, el siguiente paso es añadir autenticación, base de datos y copias de seguridad.
