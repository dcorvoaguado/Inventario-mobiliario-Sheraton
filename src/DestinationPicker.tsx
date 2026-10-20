import { useState } from "react";
import { destinations, displayCount, type Item } from "./inventory";
import { allocation, hasMovement } from "./allocation";
export default function DestinationPicker({
  item,
  items,
  onApply,
  onClose,
}: {
  item: Item;
  items: Item[];
  onApply: (hotels: string[]) => string | null;
  onClose: () => void;
}) {
  const a = allocation(items, item);
  const current = [...new Set(a.rows.map((i) => i.location).filter(Boolean))];
  const options = [...new Set([...destinations, ...current])];
  const [selected, setSelected] = useState(new Set(current)),
    [error, setError] = useState("");
  return (
    <dialog
      className="destination-dialog"
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      onCancel={onClose}
      aria-labelledby="destinations-title"
    >
      <div className="section-title">
        <h2 id="destinations-title">Destinos de {item.name}</h2>
        <button className="link" onClick={onClose} aria-label="Cerrar destinos">
          ✕
        </button>
      </div>
      <p>
        Selecciona los hoteles. Se creará una fila por destino y se conservarán
        las cantidades ya registradas.
      </p>
      <p className="destination-stock">
        Inventario disponible: <strong>{displayCount(a.limit)}</strong> ·
        Enviadas: <strong>{a.sent}</strong>
      </p>
      <div className="destination-choices">
        {options.map((h) => {
          const locked = a.rows.some((i) => i.location === h && hasMovement(i));
          return (
            <label key={h}>
              <input
                type="checkbox"
                checked={selected.has(h)}
                disabled={locked}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(h);
                  else next.delete(h);
                  setSelected(next);
                  setError("");
                }}
              />
              {h}
              {locked && <small>Con movimientos registrados</small>}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          disabled={!selected.size}
          onClick={() => {
            const issue = onApply(options.filter((h) => selected.has(h)));
            if (issue) setError(issue);
          }}
        >
          Aplicar destinos
        </button>
      </div>
    </dialog>
  );
}
