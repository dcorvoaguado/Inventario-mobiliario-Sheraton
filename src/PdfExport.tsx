import { useState } from "react";
import type { Item } from "./inventory";
export default function PdfExport({
  items,
  onClose,
}: {
  items: Item[];
  onClose: () => void;
}) {
  const [hotel, setHotel] = useState("__all"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const hotels = [
    ...new Set(items.map((i) => i.location || "Sin destino asignado")),
  ].sort((a, b) => a.localeCompare(b, "es"));
  async function generate(individual: boolean) {
    setBusy(true);
    setError("");
    try {
      const { exportPdf } = await import("./pdf");
      await exportPdf(items, hotel, individual);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo generar el documento.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      className="pdf-dialog"
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="pdf-title"
    >
      <div className="section-title">
        <h2 id="pdf-title">Exportar informe PDF</h2>
        <button
          className="link"
          aria-label="Cerrar exportación"
          disabled={busy}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <p>
        Documentos con fotografías, inventario original y corregido, envíos,
        recepciones, roturas y estado. Se usan todos los registros guardados del
        destino, independientemente de los filtros de pantalla.
      </p>
      <label className="pdf-hotel">
        Hotel destino
        <select
          aria-label="Destino del PDF"
          disabled={busy}
          value={hotel}
          onChange={(e) => setHotel(e.target.value)}
        >
          <option value="__all">Todos los hoteles destino</option>
          {hotels.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </label>
      <p>
        {hotel === "__all"
          ? `${items.length} registros, agrupados por destino en páginas independientes.`
          : `${items.filter((i) => (i.location || "Sin destino asignado") === hotel).length} registros de ${hotel}.`}
      </p>
      <p className="field-help">
        También puedes descargar un ZIP con un PDF independiente para cada
        destino. Los registros sin destino tienen su propio documento.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {busy && <p role="status">Preparando fotografías y documentos…</p>}
      <div className="form-actions">
        {hotel === "__all" && (
          <button
            className="secondary"
            disabled={busy || !items.length}
            onClick={() => generate(true)}
          >
            PDF por hotel (.zip)
          </button>
        )}
        <button
          disabled={busy || !items.length}
          onClick={() => generate(false)}
        >
          Descargar PDF
        </button>
      </div>
    </dialog>
  );
}
