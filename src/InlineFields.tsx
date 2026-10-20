import { useState, useEffect } from "react";
import { destinations, sender, type Item } from "./inventory";
export type Editable =
  | "location"
  | "correctedQuantity"
  | "sent"
  | "received"
  | "damageSent"
  | "damageReceived"
  | "damageSentMode"
  | "damageReceivedMode";
export type Change = (
  field: Editable,
  value: string | number | null,
) => boolean;
export function Count({
  value,
  label,
  disabled,
  onSave,
}: {
  value: number | null;
  label: string;
  disabled: boolean;
  onSave: (value: number | null) => boolean;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setText(value === null ? "" : String(value));
    setInvalid(false);
  }, [value]);
  function save(input: HTMLInputElement) {
    const parsed = text.trim() === "" ? null : Number(text);
    if (
      input.validity.badInput ||
      !input.validity.valid ||
      (parsed !== null && (!Number.isSafeInteger(parsed) || parsed < 0))
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== value && !onSave(parsed))
      setText(value === null ? "" : String(value));
  }
  return (
    <div>
      <input
        className="inline-number"
        type="number"
        min="0"
        step="1"
        aria-label={label}
        aria-invalid={invalid}
        disabled={disabled}
        value={text}
        placeholder="Pendiente"
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => save(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setText(value === null ? "" : String(value));
            setInvalid(false);
          }
        }}
      />
      {invalid && <small role="alert">Solo enteros de 0 en adelante.</small>}
    </div>
  );
}
export function Damage({
  item,
  side,
  disabled,
  change,
}: {
  item: Item;
  side: "Sent" | "Received";
  disabled: boolean;
  change: Change;
}) {
  const field = side === "Sent" ? "damageSent" : "damageReceived";
  const modeField = side === "Sent" ? "damageSentMode" : "damageReceivedMode";
  const count = item[field] ?? null;
  const mode =
    item[modeField] ??
    (count === null ? "pending" : count === 0 ? "none" : "damaged");
  const party = side === "Sent" ? "envío" : "recepción";
  return (
    <div className="inline-damage">
      <select
        aria-label={"Rotura " + party}
        disabled={disabled}
        value={mode}
        onChange={(e) => change(modeField, e.target.value)}
      >
        <option value="pending">Pendiente</option>
        <option value="none">Sin roturas</option>
        <option value="damaged">Con roturas</option>
      </select>
      {mode === "damaged" && (
        <Count
          value={count}
          label={"Unidades rotas en " + party}
          disabled={disabled}
          onSave={(n) => change(field, n)}
        />
      )}
    </div>
  );
}
export function Destination({
  item,
  disabled,
  change,
}: {
  item: Item;
  disabled: boolean;
  change: Change;
}) {
  return (
    <>
      <select
        className="inline-destination"
        aria-label="Destino"
        value={item.location}
        disabled={disabled || item.received !== null}
        onChange={(e) => change("location", e.target.value)}
      >
        <option value="">Sin destino asignado</option>
        {item.location && !destinations.includes(item.location) && (
          <option value={item.location} disabled>
            {item.location} · original
          </option>
        )}
        {destinations.map((h) => (
          <option key={h}>{h}</option>
        ))}
      </select>
      {item.received !== null && (
        <small>Destino fijado por la recepción.</small>
      )}
    </>
  );
}
export function canEdit(field: Editable, item: Item, actor: string) {
  return ["received", "damageReceived", "damageReceivedMode"].includes(field)
    ? Boolean(item.location) && actor === item.location
    : actor === sender;
}
