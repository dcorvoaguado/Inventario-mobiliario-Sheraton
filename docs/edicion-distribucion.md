# Edición de la distribución

La tabla principal es el único lugar donde se actualizan los registros existentes. Foto, nombre, origen e inventario original se muestran sin controles de edición. El botón de añadir permite crear un registro nuevo; no modifica los existentes. Se ha retirado el formulario general de edición y la eliminación desde la tabla para conservar las filas de referencia.

## Campos y responsable seleccionado

| Campo                    | Comportamiento                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foto, nombre y origen    | Bloqueados después del alta. Para las filas del Excel se recuperan siempre los valores originales.                                                                                          |
| Destino                  | Hotel Sheraton elige Elba Carlota, Elba Sara, Elba Lucía o Elba Palace. Se conservan los destinos históricos fuera de la lista como valores originales, sin ofrecerlos como nueva elección. |
| Inventariadas originales | Valor inalterable de la fila del Excel. Las fórmulas no resueltas conservan cantidad pendiente.                                                                                             |
| Inventario corregido     | Cantidad independiente, editable por Hotel Sheraton. Vacío significa sin corrección; cero es una corrección válida.                                                                         |
| Enviadas                 | Hotel Sheraton registra el número y queda el texto «Comprobado por Hotel Sheraton».                                                                                                         |
| Recibidas                | El hotel seleccionado debe coincidir con el destino de la fila. El registro indica el hotel que lo completó.                                                                                |
| Rotura envío             | Hotel Sheraton selecciona Pendiente, Sin roturas o Con roturas. Con roturas permite indicar unidades.                                                                                       |
| Rotura recepción         | El hotel seleccionado debe coincidir con el destino y dispone de su propio desplegable y unidades.                                                                                          |
| Estado                   | Automático: Recibido si recibidas tiene valor; en caso contrario Enviado si enviadas tiene valor; en caso contrario Pendiente. Cero también cuenta como un registro explícito.              |

Los números se guardan al salir del campo o pulsar Intro. Se rechazan negativos, decimales y enteros fuera del rango seguro. Escape descarta el texto aún no guardado. Los desplegables se guardan al elegir una opción. Sin roturas registra cero; Pendiente deja la cantidad vacía. Con roturas no inventa ninguna cantidad.

Una recepción registrada fija el destino para conservar a quién pertenece. Para cambiarlo, el destino actual debe retirar primero su recepción dejando Recibidas vacío. El estado se recalcula al retirar las cantidades. Las roturas anteriores que no tenían responsable se conservan y se muestran por separado; no se asignan a envío ni recepción por suposición.

## Compatibilidad con datos anteriores

Si una versión anterior había modificado las unidades de una fila del Excel, se recupera la cantidad original y la modificación se traslada a Inventario corregido. Se conservan las cantidades de traslado y los comentarios. La copia de procedencia no se modifica. Los CSV y JSON incluyen cantidad original, corregida, roturas de ambas partes, responsables y estado automático.

## Alcance de los controles

«Responsable de esta revisión» es una selección de trabajo, no un inicio de sesión. Cualquiera que abra la aplicación puede cambiar esa selección. Los textos «Comprobado por» reflejan el hotel seleccionado y no constituyen una identidad autenticada. Los cambios se guardan solo en el navegador actual; no hay sincronización entre hoteles. Para imponer permisos reales y compartir el mismo inventario hace falta añadir cuentas, autorización en un servidor y una base de datos común.
