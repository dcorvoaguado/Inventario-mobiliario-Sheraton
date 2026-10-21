# Estilo visual

Se sustituye el tema verde anterior por un tratamiento editorial hotelero: superficies blancas y marfil, texto carbón, acentos bronce, titulares serif y controles de líneas rectas.

Esta es una interpretación visual. La página de referencia de Marriott no ha podido consultarse porque la política de red del entorno deniega el destino con 403. Por tanto, los colores y fuentes aquí empleados no se presentan como valores extraídos de esa página ni como identidad oficial verificada.

| Uso | Valor |
| --- | --- |
| Texto y botones principales | `#252323` |
| Fondo general | `#FAF9F6` |
| Superficies cálidas | `#F3EEE7` |
| Bordes | `#DED8CE` |
| Texto secundario | `#6C665F` |
| Acentos | `#927044` |
| Enlaces | `#73552F` |
| Titulares | Cormorant Garamond, pesos 400 y 500 |
| Texto y controles | Inter, pesos 400, 500 y 600 |

Los colores generales se centralizan en variables de `src/style.css`. Los estados de traslado usan también tonos beige; los errores y las acciones destructivas conservan su señalización funcional. Las fuentes de Fontsource se incluyen como archivos locales en la compilación y no requieren peticiones a Google Fonts ni a Marriott. Las licencias OFL se distribuyen en `public/fonts/`.

## Paleta beige por bloques

La tabla lineal distingue cuatro bloques con tonos beige uniformes: información `#F3EEE7`, hotel origen `#FAF7F2`, hotel destino `#EEE6DB` y estado `#F7F2EA`. Todas las columnas de un bloque comparten fondo, incluido su encabezado. Los cambios de bloque llevan un separador; no hay alternancia por columna. El PDF conserva esa misma distribución.

El logotipo actual es un tratamiento tipográfico previo, no un recurso oficial verificado. La consulta de la página Marriott sigue bloqueada por la lista de dominios del entorno en ejecución, aunque www.marriott.com y cache.marriott.com figuran en la configuración guardada. No se ha sustituido por otro dibujo ni se afirma coincidencia exacta.

## Referencia de logotipo aportada

La cabecera usa `public/images/brand/sheraton-reference.png`, una adaptación gráfica preparada a partir de la imagen adjunta por el usuario, con S, laurel, SHERATON y EST. 1937. Sustituye la composición tipográfica anterior. No se presenta como descarga oficial de Marriott ni como copia idéntica al archivo original, que no está disponible como archivo local. Cuando se disponga del recurso original, sustituir la imagen conservando su proporción.

## Fotografía de mobiliario

En escritorio la zona de fotografía ocupa toda la altura de la fila, con ancho adaptable de 72 a 120 px y proporción conservada (`object-fit: contain`). El control de selección y el nombre se mantienen junto a la foto. En pantallas estrechas se usa una fotografía de hasta 115 × 130 px dentro de la ficha. La validación visual comprueba el alto de imagen respecto a la fila y que no haya desplazamiento horizontal entre 390 y 1440 px.

## Fotos del Excel incluidas en la aplicación

Las 63 fotografías originales del Excel se incluyen ahora como datos JPEG dentro de un módulo JavaScript independiente, generado por el plugin de Vite desde `public/images/excel`. `imageUrl` reconoce sus nombres incluso si un registro antiguo conserva un enlace absoluto o con otra ruta. Así, la tabla, galería, detalle, recuperación y PDF no dependen de que GitHub sirva los archivos JPEG por separado. Las fotos subidas por el usuario mantienen sus datos originales. Esta resolución no modifica localStorage ni los registros del inventario.

La compilación verifica que se incluyan las 63 fotos. Las pruebas de publicación hacen devolver 404 a todas las peticiones de JPEG y comprueban que todas las imágenes se decodifican y que el PDF se genera sin pedir esos archivos. El módulo de fotografías supone aproximadamente 3,36 MB comprimidos en la primera carga y se puede almacenar en caché por su nombre con hash; se conserva separado del código principal.
