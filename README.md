# Inventario de mobiliario · Sheraton

Aplicación web en español para registrar mobiliario y gestionar su distribución entre hoteles. Incluye fotografías, inventario original y corregido, envíos, recepciones, roturas, búsqueda, filtros y exportación de los registros filtrados.

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

El inventario comienza con los 73 registros del Excel. Los cambios se guardan en localStorage del navegador y origen actuales. No hay servidor, cuentas, sincronización entre dispositivos ni copias automáticas. Exporta periódicamente el CSV antes de borrar datos del navegador; esta versión no incorpora importación de copias CSV o JSON. No debe utilizarse como registro compartido o única copia del inventario real. Si el almacenamiento no puede leerse, se bloquean las escrituras para conservarlo.

La aplicación es una base inicial independiente, sin recursos oficiales de marca ni integraciones con sistemas del hotel. Para uso compartido, el siguiente paso es añadir autenticación, base de datos y copias de seguridad.

## Publicación en GitHub Pages

En Settings → Pages del repositorio, selecciona **GitHub Actions** como Source. La acción «Publicar inventario» compila con la ruta base del repositorio y despliega automáticamente los cambios en `main`. Si la primera ejecución ocurrió antes de activar Pages, abre Actions → Publicar inventario → Run workflow para repetirla.

Dirección prevista tras completar el despliegue: https://dcorvoaguado.github.io/Inventario-mobiliario-Sheraton/

La aplicación y sus archivos serán accesibles públicamente. El inventario sigue guardándose solo en el navegador de cada usuario; los datos iniciales y fotografías del Excel forman parte de la web, mientras que las ediciones guardadas localmente no se publican.

## Preparar un Excel grande

`public/preparar-excel.html` es una herramienta independiente que puede descargarse y abrirse directamente en un navegador. No requiere conexión ni sube el archivo a un servidor. Reduce las fotografías PNG/JPEG del XLSX, conserva las hojas y actualiza las referencias a las imágenes. Genera una copia y no modifica el original. Conserva el original porque las fotos de la copia pierden resolución y transparencia. Si no consigue bajar del límite de 32 MB, lo indica sin eliminar hojas ni imágenes.

## Inventario del Excel incorporado

La aplicación carga inicialmente 73 registros y 63 fotografías extraídos del Excel facilitado. Incluye hoteles de origen y destino, secciones, unidades inventariadas, enviadas, recibidas, roturas, comentario y procedencia por fila. Las cantidades desconocidas se muestran como pendientes y las fotos se pueden ampliar o recorrer en galería. Los registros locales existentes se conservan; la carga del Excel añade solo identificadores ausentes.

Consulta [el informe de importación](docs/importacion-excel.md) para los totales, datos pendientes, conservación de valores originales y método de asociación de imágenes. `docs/inventario-extraido.csv` permite revisar la extracción fuera de la aplicación.

## Edición de la distribución

La tabla principal permite elegir destino, registrar inventario corregido, enviadas, recibidas y roturas independientes de envío y recepción. Se mantienen visibles los valores originales del Excel y se bloquean foto, nombre y origen. El estado Pendiente / Enviado / Recibido se calcula a partir de las cantidades registradas. La selección «Responsable de esta revisión» habilita los campos correspondientes al hotel seleccionado. No es autenticación y los cambios siguen siendo locales al navegador. Consulta [el funcionamiento y los límites](docs/edicion-distribucion.md).
