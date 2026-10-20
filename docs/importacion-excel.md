# Importación del inventario

Archivo: **Distribucción mobiliario Sheraton rellenable - reducido.xlsx**. Hoja: **Hoja1 (2)**.

- 73 registros conservados como filas independientes.
- 63 fotografías distintas; 70 registros tienen fotografía porque algunas se comparten.
- 6250 unidades con cantidad explícita. Este total es parcial: hay cuatro cantidades sin resolver.
- Se mantienen las cuatro secciones del documento y todos los campos de origen, destino, inventariadas, enviadas, recibidas, rotura y comentario.
- Las columnas de enviadas, recibidas, rotura y comentario están sin rellenar en el archivo recibido. Los números vacíos se conservan como `null`, sin convertirlos a cero.
- El estado de conservación no aparece en el Excel: todos los registros importados quedan como **Sin evaluar**.

## Datos pendientes del documento

| Filas del Excel                  | Incidencia                                                                                | Tratamiento                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 22, 38, 57, 61                   | Cantidades con fórmulas `=I21`, `=I37`, `=I56`, `=I60`; las celdas referidas están vacías | Cantidad pendiente; fórmula y valor almacenado en Excel conservados en el origen |
| 5, 13, 17, 51, 53, 69–74, 76, 77 | Hotel destino vacío                                                                       | Sin destino asignado                                                             |
| 56, 57                           | Hotel origen vacío                                                                        | Origen pendiente                                                                 |
| 46, 47, 48                       | Sin imagen en el archivo                                                                  | Se muestra «Sin imagen»                                                          |

Los nombres y filas repetidos se conservan: no se asume que sean duplicados. «Elba Lucia» se presenta como «Elba Lucía» para agrupar el mismo destino; el texto original se conserva en los datos de procedencia.

## Fotografías en celdas de Excel

Las imágenes utilizan valores enriquecidos de Excel, no objetos de dibujo convencionales. Se siguen las referencias desde `vm` de cada celda a `valueMetadata`, `futureMetadata`, `rdrichvalue`, `richValueRel` y sus relaciones de medios. No se asignan por el orden de los archivos. Las celdas de imagen aparecen como `#VALUE!` en lectores que no soportan imágenes en celdas; se han recuperado sus fotografías desde los metadatos.

## Archivos y reproducción

- `src/data/inventory.json`: registros completos, fotos y procedencia por fila.
- `src/data/import-summary.json`: controles de extracción y hash SHA-256 del archivo recibido.
- `public/images/excel/`: las 63 imágenes recuperadas, sin otra recompresión.
- `docs/inventario-extraido.csv`: extracción independiente de los datos.
- `scripts/extract_excel.py`: extracción reproducible para este formato, sin dependencias externas. Ejecutar `python scripts/extract_excel.py /ruta/al/archivo.xlsx` desde el checkout.

El Excel recibido no se modifica ni se incorpora al repositorio. Una sesión nueva muestra los registros importados. Si hay datos locales previos, se conservan; «Cargar datos del Excel» permite añadir solo las filas del Excel ausentes, sin reemplazar registros existentes ni duplicar identificadores. Las ediciones no alteran la copia de procedencia del Excel. La carga es explícita para no resucitar registros que el usuario haya eliminado.

## Publicación y almacenamiento

Los datos importados y las fotografías forman parte de la web publicada. Los cambios de cada usuario permanecen en su navegador, sin sincronización. La copia JSON conserva los registros y su procedencia; el CSV incluye cantidades de traslado, fórmula de origen y ruta de la fotografía. Ninguno incorpora los binarios de las fotografías. Mantener el Excel original como archivo maestro y copia de las imágenes originales.
