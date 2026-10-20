# Exportación visual por hotel

En la página principal, «Exportar PDF» abre la selección de destino:

- **Todos los hoteles destino → Descargar PDF**: un documento que agrupa las filas por hotel, con cada destino comenzando en una página nueva.
- **Un hotel → Descargar PDF**: un documento solo con los registros guardados de ese destino.
- **Todos los hoteles destino → PDF por hotel (.zip)**: un ZIP con un PDF independiente para cada destino presente en los datos.

Los registros que aún no tienen destino se agrupan bajo «Sin destino asignado», tanto en el documento conjunto como en un documento independiente dentro del ZIP. Se incluyen los destinos históricos del Excel. No se generan documentos vacíos para hoteles que no tienen registros.

La selección del PDF es independiente de los filtros de búsqueda de pantalla: un informe de un hotel incorpora todos sus registros guardados en el navegador actual. Los CSV siguen utilizando los filtros de pantalla.

## Contenido

Documentos A4 horizontales con fotografías y proporciones conservadas, nombre, origen, destino, inventario original, inventario corregido, enviadas, recibidas, roturas de envío y recepción, estado automático, responsables registrados y observaciones. Incluyen totales originales conocidos por hotel, número de cantidades originales pendientes, fecha de generación en horario de Madrid y paginación.

«Pendiente» conserva la ausencia de datos; «Sin corrección» significa que se mantiene la cantidad original. Los informes no declaran una recepción completada cuando faltan datos. Las fotografías ausentes en el Excel se indican como «Sin imagen»; un fallo al descargar una foto existente detiene la exportación y permite reintentarlo.

Los PDF se generan en el navegador a partir de los datos locales. No se envían a ningún servicio externo. El ZIP permite descargar todos los documentos con un único clic. Las fuentes del PDF son Helvetica y Times, disponibles en el formato PDF; la paleta de blancos, carbón y bronce sigue el estilo de la aplicación.

## Vista adaptable

En escritorio, la tabla utiliza el ancho disponible con columnas de tamaño fijo proporcional y controles compactos. En pantallas de hasta 1000 px, cada fila se reorganiza en una ficha con campos etiquetados en dos columnas. No se ocultan datos ni se necesita desplazamiento horizontal para completar el registro.
