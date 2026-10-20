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
  onApply: (
    hotels: string[],
    quantities: Record<string, number | null>,
  ) => string | null;
  onClose: () => void;
}) {
  const a = allocation(items, item);
  const current = [...new Set(a.rows.map((i) => i.location).filter(Boolean))];
  const options = [...new Set([...destinations, ...current])];
  const [selected, setSelected] = useState(new Set(current)),
    [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      options.map((h) => {
        const row = a.rows.find(
          (row) => row.location === h && !row.isRemainder,
        );
        return [h, String(row?.allocatedQuantity ?? row?.sent ?? "")];
      }),
    ),
  );
  const assigned = options
    .filter((h) => selected.has(h))
    .reduce((sum, h) => sum + (Number(quantities[h]) || 0), 0);
  const remaining = a.limit === null ? null : a.limit - assigned;
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
        <h2 id="destinations-title">Repartir {item.name} entre hoteles</h2>
        <button className="link" onClick={onClose} aria-label="Cerrar destinos">
          ✕
        </button>
      </div>
      <p>
        Marca los hoteles e indica cuántas unidades corresponden a cada uno. Los
        movimientos registrados se conservan.
      </p>
      <div className="distribution-totals">
        <span>
          Total disponible <strong>{displayCount(a.limit)}</strong>
        </span>
        <span>
          Asignadas <strong>{assigned}</strong>
        </span>
        <span
          className={remaining !== null && remaining < 0 ? "field-error" : ""}
        >
          Sin asignar <strong>{displayCount(remaining)}</strong>
        </span>
      </div>
      <div className="destination-choices">
        {options.map((h) => {
          const locked = a.rows.some((i) => i.location === h && hasMovement(i));
          return (
            <div className="distribution-choice" key={h}>
              <label>
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
              <label className="hotel-quantity">
                <span>Unidades</span>
                <input
                  type="number"
                  min={Math.max(
                    0,
                    ...a.rows
                      .filter((row) => row.location === h)
                      .map((row) => row.sent ?? 0),
                  )}
                  step="1"
                  aria-label={`Unidades para ${h}`}
                  disabled={!selected.has(h)}
                  value={quantities[h] ?? ""}
                  placeholder="Pendiente"
                  onChange={(e) => {
                    setQuantities({ ...quantities, [h]: e.target.value });
                    setError("");
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
      {remaining !== null && remaining < 0 && (
        <p className="field-error" role="alert">
          El reparto supera el total disponible en {-remaining} unidades.
        </p>
      )}
      <p className="field-help">
        Las unidades sin asignar aparecerán en una fila propia. Un campo vacío
        significa pendiente; cero significa ninguna unidad.
      </p>
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
          disabled={!selected.size || (remaining !== null && remaining < 0)}
          onClick={() => {
            const hotels = options.filter((h) => selected.has(h));
            const values = Object.fromEntries(
              hotels.map((h) => [
                h,
                quantities[h]?.trim() ? Number(quantities[h]) : null,
              ]),
            );
            if (
              Object.values(values).some(
                (n) => n !== null && (!Number.isSafeInteger(n) || n < 0),
              )
            ) {
              setError("Indica cantidades enteras de 0 en adelante.");
              return;
            }
            const issue = onApply(hotels, values);
            if (issue) setError(issue);
          }}
        >
          Guardar reparto
        </button>
      </div>
    </dialog>
  );
}
