"""Extract this workbook without recalculating formulas or guessing missing values.
Usage: python scripts/extract_excel.py /path/to/workbook.xlsx
Uses only Python's standard library. Keeps rich-value image relationships.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import posixpath
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def local(tag): return tag.rsplit('}', 1)[-1]
def children(node, tag): return [n for n in node if local(n.tag) == tag]

def extract(path):
    records = []
    with ZipFile(path) as z:
        strings = [''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        meta = ET.fromstring(z.read('xl/metadata.xml'))
        vm = next(n for n in meta if local(n.tag) == 'valueMetadata')
        future = next(n for n in meta if local(n.tag) == 'futureMetadata' and n.get('name') == 'XLRICHVALUE')
        rich = list(ET.fromstring(z.read('xl/richData/rdrichvalue.xml')))
        structures = list(ET.fromstring(z.read('xl/richData/rdrichvaluestructure.xml')))
        rels = {r.get('Id'): posixpath.normpath('xl/richData/' + r.get('Target')) for r in ET.fromstring(z.read('xl/richData/_rels/richValueRel.xml.rels'))}
        richrels = list(ET.fromstring(z.read('xl/richData/richValueRel.xml')))
        def image(cell):
            if cell is None or not cell.get('vm'): return None
            rc = list(vm[int(cell.get('vm')) - 1])[0]
            bk = future[int(rc.get('v'))]
            ri = int(next(n for n in bk.iter() if local(n.tag) == 'rvb').get('i'))
            rv = rich[ri]
            keys = [k.get('n') for k in structures[int(rv.get('s'))]]
            idx = keys.index('_rvRel:LocalImageIdentifier')
            rel = richrels[int(list(rv)[idx].text)]
            return rels[rel.get('{' + NS['r'] + '}id')]
        section = 'Distribución inicial'
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).find('s:sheetData', NS):
            cells = {''.join(c for c in n.get('r') if c.isalpha()): n for n in row}
            def value(col):
                c = cells.get(col)
                if c is None: return None
                v = c.find('s:v', NS)
                if v is None: return None
                if c.get('t') == 's': return strings[int(v.text)]
                if c.get('t') == 'e': return v.text
                try: return int(v.text)
                except (ValueError, TypeError): return v.text
            rownum = int(row.get('r'))
            if rownum == 1: continue
            name = value('D')
            if not name:
                if value('B'): section = value('B')
                continue
            formulas = {c: '=' + n.find('s:f', NS).text for c,n in cells.items() if n.find('s:f', NS) is not None}
            origin, dest = value('B'), value('C')
            asset = image(cells.get('E'))
            photo = None
            if asset:
                photo = 'images/excel/' + Path(asset).name
                (ROOT/'public'/photo).write_bytes(z.read(asset))
            def quantity(col):
                v = value(col)
                return v if col not in formulas and isinstance(v, int) and v >= 0 else None
            fields = {'B':origin,'C':dest,'D':name,'F':value('F'),'G':value('G'),'H':value('H'),'I':value('I'),'J':value('J')}
            records.append({'id':f'excel-row-{rownum}', 'name':name.strip(),
                'origin':origin.strip() if origin else '',
                'location':(dest.strip().replace('Elba Lucia','Elba Lucía') if dest else ''),
                'category':section, 'quantity':quantity('F'), 'sent':quantity('G'),
                'received':quantity('H'), 'recycled':quantity('I'), 'condition':'Sin evaluar',
                'notes':value('J') or '', 'image':photo,
                'source':{'sheet':'Hoja1 (2)','row':rownum,'cells':fields,'formulas':formulas}})
        media = [p for p in z.namelist() if p.startswith('xl/media/')]
        used = {r['image'] for r in records if r['image']}
        assert len(used) == len(media), 'An image was not associated with a row'
    # User clarified that these repeated rows share the previous row's inventory.
    by_row = {r['source']['row']: r for r in records}
    overrides = json.loads((ROOT/'scripts/quantity-overrides.json').read_text())
    for child, parent in overrides.items():
        repeated, original = by_row[int(child)], by_row[parent]
        assert repeated['name'].casefold() == original['name'].casefold()
        assert isinstance(original['quantity'], int)
        repeated['quantity'] = original['quantity']
        repeated['source']['quantityInheritedFrom'] = parent
        repeated['inventoryGroup'] = original['inventoryGroup'] = original['id']
    totals = {r.get('inventoryGroup',r['id']):r['quantity'] for r in records}
    summary = {'file':Path(path).name,'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),
      'records':len(records),'uniqueImages':len(used),'recordsWithImages':sum(bool(r['image']) for r in records),
      'knownUnits':sum(n or 0 for n in totals.values()),'displayedRowUnits':sum(r['quantity'] or 0 for r in records),'unknownQuantities':[r['source']['row'] for r in records if r['quantity'] is None],
      'missingDestinations':[r['source']['row'] for r in records if not r['location']],
      'missingOrigins':[r['source']['row'] for r in records if not r['origin']],
      'missingImages':[r['source']['row'] for r in records if not r['image']],
      'notes':['No se fusionan filas con nombres repetidos.', 'Cantidades repetidas completadas con la fila anterior según aclaración del usuario. Las partidas compartidas solo se cuentan una vez en los totales. Se conservan fórmula y valor en caché originales.', 'Elba Lucia se muestra como Elba Lucía; el texto original se conserva en source.cells.', 'Enviadas, recibidas y roturas vacías se conservan como null.', 'No se infiere estado de conservación.']}
    (ROOT/'src/data/inventory.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'src/data/import-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    out=io.StringIO(); writer=csv.writer(out, lineterminator="\n"); writer.writerow(['Fila Excel','Sección','Hotel origen','Hotel destino','Artículo','Inventariadas','Enviadas','Recibidas','Rotura','Comentario','Imagen','Fórmula inventariadas'])
    for r in records: writer.writerow([r['source']['row'],r['category'],r['origin'],r['source']['cells']['C'],r['name'],r['quantity'],r['sent'],r['received'],r['recycled'],r['notes'],r['image'],("'" + r['source']['formulas']['F']) if r['source']['formulas'].get('F') else ''])
    (ROOT/'docs/inventario-extraido.csv').write_text(out.getvalue(),encoding='utf-8-sig')
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__ == '__main__': extract(sys.argv[1])
