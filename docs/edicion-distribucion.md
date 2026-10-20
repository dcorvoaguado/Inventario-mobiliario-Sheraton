# Edición de la distribución

La tabla principal es el único lugar donde se actualizan los registros existentes. Foto, nombre, origen e inventario original se muestran sin controles de edición. El botón de añadir permite crear un registro nuevo; no modifica los existentes. Se ha retirado el formulario general de edición. El borrado por selección restablece los registros del Excel y elimina los registros creados posteriormente, con confirmación.

## Campos y responsable seleccionado

| Campo                    | Comportamiento                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foto, nombre y origen    | Bloqueados después del alta. Para las filas del Excel se recuperan siempre los valores originales.                                                                                          |
| Destino                  | Hotel Sheraton elige Elba Carlota, Elba Sara, Elba Palace, Elba Lucía o Elba San Jorge. Se conservan los destinos históricos fuera de la lista como valores originales, sin ofrecerlos como nueva elección. |
| Inventariadas originales | Valor inalterable de la fila del Excel. Las fórmulas no resueltas conservan cantidad pendiente.                                                                                             |
| Inventario corregido     | Cantidad común a todos los destinos del mismo mueble, editable por Hotel Sheraton. Vacío significa sin corrección; cero es una corrección válida.                                                                         |
| Enviadas                 | Hotel Sheraton registra el número y queda el texto «Comprobado por Hotel Sheraton».                                                                                                         |
| Recibidas                | El hotel seleccionado debe coincidir con el destino de la fila. El registro indica el hotel que lo completó.                                                                                |
| Rotura envío             | Hotel Sheraton selecciona Pendiente, Sin roturas o Con roturas. Con roturas permite indicar unidades.                                                                                       |
| Rotura recepción         | El hotel seleccionado debe coincidir con el destino y dispone de su propio desplegable y unidades.                                                                                          |
| Estado                   | Automático: Recibido si recibidas tiene valor; en caso contrario Enviado si enviadas tiene valor; en caso contrario Pendiente. Cero también cuenta como un registro explícito.              |

Los números se guardan al salir del campo o pulsar Intro. Se rechazan negativos, decimales y enteros fuera del rango seguro. Escape descarta el texto aún no guardado. Los desplegables se guardan al elegir una opción. Sin roturas registra cero; Pendiente deja la cantidad vacía. Con roturas no inventa ninguna cantidad.

Un destino con envíos, recepción o roturas registrados queda fijado para conservar sus movimientos. Para retirarlo o cambiarlo hay que vaciar primero esos datos con el responsable correspondiente. El estado se recalcula al retirar las cantidades. Las roturas anteriores que no tenían responsable se conservan y se muestran por separado; no se asignan a envío ni recepción por suposición.

## Compatibilidad con datos anteriores

Si una versión anterior había modificado las unidades de una fila del Excel, se recupera la cantidad original y la modificación se traslada a Inventario corregido. Se conservan las cantidades de traslado y los comentarios. La copia de procedencia no se modifica. Los CSV y JSON incluyen cantidad original, corregida, roturas de ambas partes, responsables y estado automático.

## Alcance de los controles

«Responsable de esta revisión» es una selección de trabajo, no un inicio de sesión. Cualquiera que abra la aplicación puede cambiar esa selección. Los textos «Comprobado por» reflejan el hotel seleccionado y no constituyen una identidad autenticada. Los cambios se guardan solo en el navegador actual; no hay sincronización entre hoteles. Para imponer permisos reales y compartir el mismo inventario hace falta añadir cuentas, autorización en un servidor y una base de datos común.

## Fotos en el alta

En «Nuevo mobiliario» se puede seleccionar una foto JPG, PNG o WebP desde la galería del dispositivo o desde el equipo, o reutilizar una foto del inventario. Se muestra una vista previa, se permite retirarla antes de guardar y el botón de alta espera a que se prepare. El archivo original no se modifica; se genera una copia JPEG ligera, con fondo blanco para transparencias, que se guarda con el registro en el navegador. Tras el alta, la foto queda bloqueada como las fotos del Excel. También se incluye en los PDF y en la copia JSON. Los fallos de lectura o de cuota de almacenamiento se notifican sin sobrescribir los registros anteriores.

## Selección y borrado

Las casillas de la tabla y de la galería permiten seleccionar registros concretos. «Seleccionar todo el mobiliario» abarca todos los registros, incluidos los ocultos por filtros. El contador avisa si hay seleccionados fuera del filtro.

Con Hotel Sheraton seleccionado, «Borrar datos seleccionados» muestra «Estás a punto de borrar todos los datos, ¿estás seguro?», el número de afectados y el alcance exacto. «No» o Escape cancelan sin cambios. «Sí» restablece los registros del Excel a su estado base, conservando fotos, nombres, origen, inventario y las cantidades repetidas aclaradas; restablece destinos y retira correcciones, envíos, recepciones, roturas y comentarios añadidos. Los registros nuevos seleccionados se eliminan junto con sus fotos. Los no seleccionados se conservan. La operación se aplica a los datos de este navegador.

## Búsqueda flexible

La búsqueda ignora mayúsculas, tildes, espacios y signos de puntuación tanto en los datos como en la consulta. «SOFA», «sofá» y «S.O.F.A.» encuentran los mismos registros. Se aplica a nombre, categoría, origen y destino sin modificar el texto que se muestra o se exporta.

## Bloques visuales por responsabilidad

La tabla y los PDF agrupan los datos en este orden:

1. **Beige:** mobiliario, origen, destino e inventario original.
2. **Azul grisáceo pastel:** inventario corregido, enviadas de Hotel Sheraton y rotura de envío.
3. **Burdeos grisáceo pastel:** recibidas del hotel destino y rotura de recepción.
4. **Gris neutro:** estado común del traslado.

Los encabezados de grupo y las líneas divisorias acompañan al color para identificar el responsable. Los controles numéricos de la tabla miden como máximo 64 px en escritorio y 72 px en pantallas estrechas. Se mantiene la vista sin desplazamiento horizontal. En móvil, los bloques conservan color y separadores al reorganizarse como fichas. El CSV sigue el mismo orden de campos de envío y recepción.

## Varios destinos por mobiliario

En Destino, «Seleccionar varios hoteles» permite marcar los hoteles y aplicar el reparto. Se crea una fila por hotel, con la misma foto, procedencia e inventario. Las cantidades de envío, recepción y roturas pertenecen a cada destino. Los movimientos existentes se conservan y no se permite desmarcar un hotel que los tenga.

El inventario corregido es común: cambiarlo en una fila actualiza las demás del mismo mueble. La suma de enviadas de todos sus destinos no puede superarlo; se comprueba también la suma de recibidas, por separado. Sin corrección se utiliza el inventario original; si tampoco existe, hay que indicar una corrección antes de registrar cantidades positivas. No se permite reducir el inventario por debajo de los movimientos registrados. El resumen muestra las enviadas y las unidades disponibles, incluyendo filas ocultas por filtros.

El reparto se conserva al recargar y se incluye en las exportaciones por hotel. «Cargar Excel» no vuelve a añadir destinos retirados de un producto ya distribuido. Al borrar todas las filas de un mueble se recupera su distribución original; al borrar solo algunas, se conservan el inventario corregido compartido y los movimientos de las filas no seleccionadas. Estos controles se aplican a los datos del navegador actual, sin sincronización entre dispositivos.

Cada hotel solo puede registrar recibidas iguales o inferiores a las enviadas a ese destino. Sin envío registrado no se aceptan recepciones positivas. Tampoco se permite reducir un envío por debajo de su recepción ya registrada. El inventario corregido puede ser mayor o menor que el original, siempre que cubra las cantidades ya registradas.

## Eliminar mobiliario y recuperarlo

«Borrar mobiliario», en rojo junto a «Borrar datos seleccionados», retira las filas marcadas del inventario activo y de las exportaciones. Solo está disponible con Hotel Sheraton seleccionado. La confirmación indica cuántas filas se eliminarán, incluye las ocultas por filtros y advierte de que puede afectar al inventario y al reparto. Cancelar no modifica nada. Antes de retirar una fila se guarda una copia local de todos sus datos, incluida la fotografía; si falla ese guardado, no se elimina.

«Recuperar mobiliario eliminado (N)» abre una lista con fotografías, destino y cantidades. Permite marcar cada fila o seleccionar todas y recuperar solo las seleccionadas con sus datos guardados. No sobrescribe las filas activas. Si los movimientos recuperados superan el inventario compartido, las correcciones difieren o una recepción supera su envío, la recuperación se detiene sin cambios y mantiene la copia para reintentar tras ajustar los datos activos. Las eliminaciones no se revierten mediante «Cargar datos del Excel» ni mediante el restablecimiento de otros registros del mismo grupo.

Las copias de recuperación se guardan exclusivamente en este navegador, igual que el inventario activo. Borrar los datos del navegador elimina también esa recuperación; las exportaciones del inventario activo no incluyen la copia de eliminados. «Borrar datos seleccionados» conserva su función de restablecer datos y es diferente de eliminar mobiliario.

## Cantidades necesarias y pendientes de asignar

La columna «Cantidades necesarias», junto al inventario original, indica las unidades reservadas para cada hotel. Las filas del mismo producto muestran «(Total mobiliario a repartir entre hoteles)» junto al inventario original, para aclarar que el total no se multiplica por las filas. El inventario corregido sigue siendo común y prevalece sobre el original.

Al introducir una cantidad necesaria, se calcula automáticamente la diferencia entre ese total y las cantidades asignadas a hoteles. Si quedan unidades, aparece una fila «Sin hotel asignado» con esa diferencia exacta; desaparece cuando se distribuye todo. Ejemplo: total 10, Sara 5, Palace 4 → pendiente 1. La fila calculada no se borra manualmente ni se edita su cantidad: cambia al modificar el reparto. Se le puede asignar otro hotel desde Destino. Las cantidades aún vacías se muestran pendientes y no se inventa un reparto.

No se admiten repartos por encima del inventario, ni envíos superiores a la cantidad necesaria asignada a su hotel. Una cantidad necesaria no puede reducirse por debajo de un envío registrado. Si se modifica el total corregido, se recalcula la diferencia. El reparto se conserva al recargar y se incluye en PDF, CSV y JSON. Elba San Jorge está disponible tanto en el selector simple y múltiple como en las altas y en el selector de hotel responsable.

## Interfaz agrupada de reparto

Cada mueble se presenta en una cabecera con fotografía, nombre, origen e inventario original inalterable. «Total real disponible» es el nombre visible del inventario corregido compartido; mientras no se modifica, muestra el total original. Debajo aparecen únicamente los destinos y sus movimientos. Los filtros ocultan filas, pero el resumen y los límites siempre cuentan el grupo completo.

«Repartir entre hoteles» abre una única ventana con casillas de hoteles y unidades por destino. Se muestra el total disponible, la suma asignada y las unidades sin asignar antes de guardar. El reparto completo se guarda de una vez, lo que permite trasladar reservas entre hoteles sin errores por estados intermedios. Los hoteles con movimientos permanecen marcados y las cantidades deben cubrir los envíos ya registrados. Se mantiene la fila calculada para las unidades pendientes de asignar.

La cabecera distingue unidades asignadas, sin asignar, enviadas y pendientes de enviar; avisa cuando faltan cantidades por completar. Los controles numéricos muestran validaciones y límites junto al campo y «Guardado ✓» después de una modificación aceptada. Los campos de recepción bloqueados indican qué hotel debe seleccionarse. «Restablecer datos» y «Eliminar mobiliario» conservan funciones diferentes y confirmaciones independientes.

La galería muestra una tarjeta por grupo, con los destinos del producto y acceso al mismo reparto. «Más opciones» contiene la carga del Excel, la descarga de copia de seguridad y el CSV; el PDF permanece visible. Los avisos generales de acciones se muestran flotantes para evitar desplazar el formulario mientras se trabaja. El almacenamiento sigue siendo local, sin autenticación ni sincronización entre hoteles.
