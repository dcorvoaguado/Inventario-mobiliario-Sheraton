"""Generate the two-page user guide. Requires reportlab and fonttools."""
from pathlib import Path
from xml.sax.saxutils import escape
from fontTools.ttLib import TTFont as SourceFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/manual-uso-inventario-sheraton.pdf'
URL = 'https://dcorvoaguado.github.io/Inventario-mobiliario-Sheraton/'
for name, package, filename in [
    ('Inter', 'inter', 'inter-latin-400-normal.woff'),
    ('InterBold', 'inter', 'inter-latin-600-normal.woff'),
    ('Heading', 'cormorant-garamond', 'cormorant-garamond-latin-500-normal.woff'),
]:
    source = ROOT / 'node_modules/@fontsource' / package / 'files' / filename
    target = Path('/tmp') / f'sheraton-manual-{name}.ttf'
    font = SourceFont(source)
    font.flavor = None
    font.save(target)
    pdfmetrics.registerFont(TTFont(name, str(target)))
pdfmetrics.registerFontFamily('Inter', normal='Inter', bold='InterBold', italic='Inter', boldItalic='InterBold')
INK = colors.HexColor('#252323')
MUTED = colors.HexColor('#6c665f')
BEIGE = colors.HexColor('#f3eee7')
LIGHT = colors.HexColor('#faf7f2')
LINE = colors.HexColor('#ded8ce')
GREEN = colors.HexColor('#e5f0e4')
RED = colors.HexColor('#f6e3e0')
styles = {
    'title': ParagraphStyle('title', fontName='Heading', fontSize=25, leading=28, textColor=INK, spaceAfter=5),
    'sub': ParagraphStyle('sub', fontName='Inter', fontSize=10, leading=15, textColor=MUTED, spaceAfter=12),
    'h': ParagraphStyle('h', fontName='InterBold', fontSize=11.2, leading=16, textColor=INK, spaceBefore=8, spaceAfter=4),
    'body': ParagraphStyle('body', fontName='Inter', fontSize=9.8, leading=13.5, textColor=INK, spaceAfter=5),
    'small': ParagraphStyle('small', fontName='Inter', fontSize=8.5, leading=12, textColor=MUTED, spaceAfter=4),
    'cell': ParagraphStyle('cell', fontName='Inter', fontSize=9, leading=12.5, textColor=INK),
    'cellhead': ParagraphStyle('cellhead', fontName='InterBold', fontSize=9, leading=12.5, textColor=INK),
}
def P(text, style='body'):
    return Paragraph(text, styles[style])
def section(title, *paragraphs):
    return KeepTogether([P(title, 'h'), *[P(text) for text in paragraphs]])
def box(text, bg=BEIGE):
    t = Table([[P(text)]], colWidths=[499])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),bg),('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),11),('RIGHTPADDING',(0,0),(-1,-1),11),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    return t

def decorate(canvas, doc):
    width, height = A4
    canvas.setFillColor(BEIGE)
    canvas.rect(0,height-72,width,72,fill=1,stroke=0)
    canvas.drawImage(ImageReader(str(ROOT/'public/images/brand/sheraton-reference.png')),43,height-62,width=112,height=48,preserveAspectRatio=True,mask='auto')
    canvas.setFont('InterBold',9)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width-48,height-39,'INVENTARIO Y DISTRIBUCIÓN')
    canvas.setStrokeColor(LINE)
    canvas.line(48,44,width-48,44)
    canvas.setFont('Inter',8)
    canvas.drawString(48,30,'Guía rápida · 21 de octubre de 2026')
    canvas.drawRightString(width-48,30,f'{doc.page} / 2')

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=91, bottomMargin=58, title='Manual rápido de uso · Inventario Sheraton', author='Inventario de mobiliario Sheraton')
story = [P('Repartir, enviar y recibir', 'title'), P('Manual rápido de uso · Sigue estos pasos en orden.', 'sub')]
story.append(P(f'<link href="{URL}" color="#73552f"><u>Abrir la página de inventario</u></link>', 'body'))
story.append(section('1. Elige el hotel que registra', '<b>Hotel Sheraton:</b> organiza el reparto, modifica cantidades y registra los envíos.<br/><b>Hotel destino:</b> selecciónalo para completar sus recibidas y roturas de recepción.', 'Si un campo está gris, lee el mensaje que indica qué hotel debes seleccionar.'))
story.append(section('2. Busca el mueble', 'Usa el buscador o filtra por destino, estado o sección. La búsqueda admite <b>SOFA</b> aunque figure <b>sofá</b>. Pulsa la fotografía para ampliarla.'))
story.append(section('3. Revisa el total y reparte', 'El <b>Inventario original</b> no se edita. En <b>Total real disponible</b> puedes indicar una cantidad mayor o menor: es el total compartido, no una cantidad nueva por cada fila.', 'Pulsa <b>Repartir entre hoteles</b>, marca destinos, indica las unidades de cada uno y pulsa <b>Guardar reparto</b>. Se crea una fila por hotel; el sobrante aparece como <b>Sin hotel asignado</b>.'))
story.append(P('Ejemplo: un mueble con 50 unidades', 'h'))
rows = [[P('Destino','cellhead'),P('Unidades','cellhead'),P('Aviso','cellhead')], [P('Elba Carlota','cell'),P('14','cell'),P('NO DISPONIBLE · Hotel asignado','cell')], [P('Elba San Jorge','cell'),P('10','cell'),P('NO DISPONIBLE · Hotel asignado','cell')], [P('Sin hotel asignado','cell'),P('26','cell'),P('DISPONIBLE · 26 unidades','cell')]]
t = Table(rows,colWidths=[157,65,277])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),BEIGE),('BACKGROUND',(2,1),(2,2),RED),('BACKGROUND',(2,3),(2,3),GREEN),('GRID',(0,0),(-1,-1),.4,LINE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story += [t, Spacer(1,7), P('<b>El rojo significa reservado; no bloquea ampliar la reserva.</b> Si Carlota pasa de 14 a 20 en <b>Unidades asignadas</b>, el sobrante baja de 26 a 20. No puedes tomar unidades reservadas para otro hotel.', 'small')]
story.append(section('4. Registra el envío y la recepción', '<b>Sheraton:</b> completa <b>Enviadas</b> y <b>Rotura envío</b>. El destino completa <b>Recibidas</b> y <b>Rotura recepción</b> con su hotel seleccionado.', '<b>Recibidas nunca puede superar Enviadas.</b> Si se enviaron 35, se aceptan hasta 35 recibidas. En roturas, elige Pendiente, Sin roturas o Con roturas; esta última permite indicar unidades.'))
story += [Spacer(1,5), box('<b>Guardar:</b> pulsa Intro o sal del campo. «Guardado» confirma el cambio.<br/><b>Vacío</b> = pendiente · <b>0</b> = ninguna unidad. Estado automático: <b>Enviado</b> al registrar envío y <b>Recibido</b> al registrar recepción.')]
story.append(PageBreak())
story += [P('Añadir, exportar y cuidar los datos','title'),P('Acciones habituales y precauciones para no perder el trabajo.','sub')]
story.append(section('5. Añade mobiliario', 'Selecciona <b>Hotel Sheraton</b> y pulsa <b>Añadir mobiliario</b>. Completa nombre, <b>Hotel origen</b>, <b>Hotel destino</b> y unidades; las notas son opcionales.', 'Añade una foto desde el equipo o la galería, o elige <b>Usar foto del inventario</b>. Pulsa <b>Guardar mobiliario</b>.', 'Después puedes <b>Repartir entre hoteles</b>. Foto, nombre y origen quedan bloqueados tras el alta.'))
story.append(section('6. Descarga el documento final', 'Pulsa <b>Exportar PDF</b> y elige:<br/>• <b>Todos los hoteles destino:</b> un PDF agrupado por destino.<br/>• <b>Un hotel:</b> su documento individual.<br/>• <b>PDF por hotel (.zip):</b> un archivo con los PDF separados.', 'Pulsa <b>Descargar PDF</b>. Incluye todos los registros del hotel elegido, aunque hayas filtrado la tabla.'))
story.append(section('7. Restablece, elimina o recupera', 'Marca las casillas de las filas. <b>Seleccionar todo el mobiliario</b> incluye filas ocultas por filtros. Revisa cuántas has seleccionado antes de confirmar.'))
rows = [[P('Botón','cellhead'),P('Qué hace','cellhead')], [P('Restablecer datos','cellhead'),P('Restablece datos del Excel. Si marcas todas las filas del producto, también su reparto original. Elimina muebles nuevos seleccionados.','cell')], [P('Eliminar mobiliario','cellhead'),P('Retira las filas de la tabla y los PDF. Conserva una copia local para recuperarlas.','cell')], [P('Recuperar mobiliario eliminado','cellhead'),P('Elige uno, varios o todos y pulsa Recuperar seleccionados. Restaura sus fotos y datos si las cantidades siguen siendo válidas.','cell')]]
t = Table(rows,colWidths=[169,330])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),BEIGE),('BACKGROUND',(0,1),(0,-1),LIGHT),('GRID',(0,0),(-1,-1),.4,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story += [t, Spacer(1,9)]
story.append(section('8. Guarda una copia de tu trabajo', 'En <b>Más opciones / Descargar copia de seguridad</b> guardas el inventario activo en JSON. <b>Exportar CSV</b> descarga los registros visibles para una hoja de cálculo.', '<b>Cargar datos del Excel</b> incorpora registros originales que falten; no importa un Excel nuevo.'))
story += [Spacer(1,6),box('<b>Los datos se guardan solo en este navegador.</b> No se sincronizan entre dispositivos ni hoteles. No borres sus datos. El JSON no incluye los eliminados y la web no tiene botón para importarlo. El selector de hotel organiza la edición; no es un inicio de sesión.')]
story += [Spacer(1,8), P('<b>Si un campo no te deja continuar:</b> lee su aviso y revisa el hotel seleccionado, el total y las unidades sin asignar.', 'small')]
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
print(OUT)
