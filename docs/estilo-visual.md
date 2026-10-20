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
