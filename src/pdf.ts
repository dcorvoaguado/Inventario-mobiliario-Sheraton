import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { zipSync } from "fflate";
import {
  imageUrl,
  transferStatus,
  inventoryTotal,
  type Item,
} from "./inventory";
type Picture = { bytes: Uint8Array; width: number; height: number };
const unassigned = "Sin destino asignado";
export const hotelName = (item: Item) => item.location || unassigned;
export function pdfHotels(items: Item[]) {
  return [...new Set(items.map(hotelName))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}
const amount = (n: number | null | undefined) =>
  n == null ? "Pendiente" : String(n);
function damage(item: Item, side: "Sent" | "Received") {
  const mode = item[side === "Sent" ? "damageSentMode" : "damageReceivedMode"];
  const n = item[side === "Sent" ? "damageSent" : "damageReceived"];
  return mode === "pending" ? "Pendiente" : mode === "none" ? "0" : amount(n);
}
const filename = (name: string) =>
  "inventario-" +
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "") +
  ".pdf";
async function pictures(items: Item[]) {
  const result = new Map<string, Picture>();
  await Promise.all(
    [...new Set(items.map((i) => i.image).filter((p): p is string => !!p))].map(
      async (p) => {
        const response = await fetch(imageUrl(p));
        if (!response.ok)
          throw Error(
            "No se pudo cargar una fotografía. Reintenta la exportación.",
          );
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        result.set(p, {
          bytes: new Uint8Array(await blob.arrayBuffer()),
          width: bitmap.width,
          height: bitmap.height,
        });
        bitmap.close();
      },
    ),
  );
  return result;
}
function render(items: Item[], title: string, photos: Map<string, Picture>) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  doc.setProperties({
    title: "Inventario Sheraton - " + title,
    subject: "Distribución de mobiliario por hotel destino",
    creator: "Inventario Sheraton",
  });
  const time = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date());
  const groups = pdfHotels(items);
  groups.forEach((hotel, index) => {
    if (index) doc.addPage();
    const entries = items.filter((i) => hotelName(i) === hotel);
    const original = inventoryTotal(entries);
    const unknown = entries.filter((i) => i.quantity === null).length;
    doc.setFillColor("#252323");
    doc.rect(0, 0, 297, 3, "F");
    doc.setTextColor("#252323");
    doc.setFont("times", "normal");
    doc.setFontSize(21);
    doc.text("SHERATON", 10, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#6c665f");
    doc.text("FUERTEVENTURA | INVENTARIO Y DISTRIBUCIÓN", 10, 21);
    doc.text("Generado: " + time + " (Madrid)", 287, 14, { align: "right" });
    doc.setFont("times", "normal");
    doc.setFontSize(19);
    doc.setTextColor("#252323");
    doc.text(hotel, 10, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${entries.length} registros | ${original} unidades originales conocidas | ${unknown} cantidades originales pendientes`,
      10,
      39,
    );
    doc.setFontSize(7);
    doc.setTextColor("#6c665f");
    doc.text(
      "Origen e inventario original conservados. Pendiente = sin dato. Sin corrección = se mantiene el original.",
      10,
      45,
    );
    autoTable(doc, {
      startY: 50,
      margin: { top: 14, right: 10, bottom: 18, left: 10 },
      tableWidth: 277,
      showHead: "everyPage",
      rowPageBreak: "avoid",
      head: [
        [
          { content: "Información original", colSpan: 5 },
          { content: "Hotel origen · Sheraton", colSpan: 3 },
          { content: "Hotel destino", colSpan: 2 },
          { content: "Común", colSpan: 1 },
        ],
        [
          "Foto",
          "Mobiliario / observaciones",
          "Origen",
          "Destino",
          "Inventario\noriginal",
          "Inventario\ncorregido",
          "Enviadas",
          "Rotura\nenvío",
          "Recibidas",
          "Rotura\nrecepción",
          "Estado",
        ],
      ],
      body: entries.map((i) => [
        "",
        `${i.name}${i.notes ? "\n" + i.notes : ""}${i.recycled !== null ? "\nRotura anterior sin responsable: " + i.recycled : ""}`,
        i.origin || "Pendiente",
        hotel,
        amount(i.quantity),
        i.correctedQuantity == null
          ? "Sin corrección"
          : String(i.correctedQuantity),
        amount(i.sent) + (i.sentBy ? "\nComprobado por " + i.sentBy : ""),
        damage(i, "Sent"),
        amount(i.received) +
          (i.receivedBy ? "\nComprobado por " + i.receivedBy : ""),
        damage(i, "Received"),
        transferStatus(i),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 2,
        minCellHeight: 23,
        textColor: "#252323",
        lineColor: "#ded8ce",
        lineWidth: 0.15,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: "#f3eee7",
        textColor: "#252323",
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: "#faf9f6" },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 47 },
        2: { cellWidth: 22 },
        3: { cellWidth: 31 },
        4: { cellWidth: 17 },
        5: { cellWidth: 17 },
        6: { cellWidth: 32 },
        7: { cellWidth: 18 },
        8: { cellWidth: 32 },
        9: { cellWidth: 18 },
        10: { cellWidth: 23 },
      },
      didParseCell: (data) => {
        const index = data.column.index;
        const group = index < 5 ? 0 : index < 8 ? 1 : index < 10 ? 2 : 3;
        const colors =
          data.section === "head"
            ? ["#f3eee7", "#dce5ea", "#e8dce1", "#e3e3e3"]
            : ["#fcfaf7", "#eff4f6", "#f7f0f3", "#f3f3f3"];
        data.cell.styles.fillColor = colors[group];
        if (data.section === "head")
          data.cell.styles.minCellHeight = data.row.index === 0 ? 8 : 13;
      },
      didDrawCell: (data) => {
        if ([5, 8, 10].includes(data.column.index)) {
          doc.setDrawColor("#b7b4b2");
          doc.setLineWidth(0.5);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x,
            data.cell.y + data.cell.height,
          );
        }
        if (data.section !== "body" || data.column.index !== 0) return;
        const item = entries[data.row.index];
        const p = item.image ? photos.get(item.image) : undefined;
        if (!p) {
          doc.setFontSize(6);
          doc.setTextColor("#6c665f");
          doc.text(
            "Sin imagen",
            data.cell.x + 2,
            data.cell.y + data.cell.height / 2,
          );
          return;
        }
        const scale = Math.min(
          (data.cell.width - 4) / p.width,
          (data.cell.height - 4) / p.height,
        );
        const w = p.width * scale,
          h = p.height * scale;
        doc.addImage(
          p.bytes,
          "JPEG",
          data.cell.x + (data.cell.width - w) / 2,
          data.cell.y + (data.cell.height - h) / 2,
          w,
          h,
          item.image!,
          "FAST",
        );
      },
    });
  });
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor("#6c665f");
    doc.text(
      "Informe de datos registrados; puede contener cantidades pendientes. Datos guardados en este navegador.",
      10,
      201,
    );
    doc.text(`Página ${p} de ${total}`, 287, 201, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
function save(bytes: Uint8Array, type: string, name: string) {
  const copy = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([copy], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPdf(
  items: Item[],
  hotel: string,
  individual = false,
) {
  const selected =
    hotel === "__all" ? items : items.filter((i) => hotelName(i) === hotel);
  if (!selected.length)
    throw Error("No hay registros para el destino seleccionado.");
  const photos = await pictures(selected);
  if (individual) {
    const files: Record<string, Uint8Array> = {};
    for (const h of pdfHotels(selected))
      files[filename(h)] = render(
        selected.filter((i) => hotelName(i) === h),
        h,
        photos,
      );
    save(
      zipSync(files, { level: 1 }),
      "application/zip",
      "inventarios-por-hotel.zip",
    );
  } else
    save(
      render(
        selected,
        hotel === "__all" ? "Todos los hoteles destino" : hotel,
        photos,
      ),
      "application/pdf",
      filename(hotel === "__all" ? "todos-los-hoteles" : hotel),
    );
}
