import { useState, useEffect, useId } from "react";
import { sender, type Item } from "./inventory";
export type Editable =
  | "location"
  | "allocatedQuantity"
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
  max,
  error,
  disabledReason,
}: {
  value: number | null;
  label: string;
  disabled: boolean;
  onSave: (value: number | null) => boolean;
  max?: number;
  error?: string;
  disabledReason?: string;
}) {
  const feedbackId = useId();
  const [text, setText] = useState(value === null ? "" : String(value));
  const [invalid, setInvalid] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setText(value === null ? "" : String(value));
    setInvalid(false);
    setRejected(false);
  }, [value]);
  function save(input: HTMLInputElement) {
    const parsed = text.trim() === "" ? null : Number(text);
    if (
      input.validity.badInput ||
      !input.validity.valid ||
      (parsed !== null && (!Number.isSafeInteger(parsed) || parsed < 0))
    ) {
      setSaved(false);
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== value) {
      const success = onSave(parsed);
      setRejected(!success);
      setSaved(success);
      if (!success) setText(value === null ? "" : String(value));
    }
  }
  return (
    <div>
      <input
        className="inline-number"
        type="number"
        min="0"
        step="1"
        max={max}
        aria-label={label}
        aria-describedby={feedbackId}
        aria-invalid={invalid || rejected}
        disabled={disabled}
        value={text}
        placeholder="—"
        title={value === null ? "Pendiente de registrar" : String(value)}
        onChange={(e) => {
          setText(e.target.value);
          setRejected(false);
          setInvalid(false);
          setSaved(false);
        }}
        onBlur={(e) => save(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setText(value === null ? "" : String(value));
            setInvalid(false);
            setRejected(false);
            setSaved(false);
          }
        }}
      />
      <div id={feedbackId}>
        {invalid && (
          <small role="alert" className="field-error">
            {max !== undefined && Number(text) > max
              ? `Máximo: ${max} unidades.`
              : "Solo enteros de 0 en adelante."}
          </small>
        )}
        {rejected && (
          <small role="alert" className="field-error">
            {error || "No se pudo guardar este valor."}
          </small>
        )}
        {saved && !invalid && !rejected && (
          <small className="field-saved" role="status">
            Guardado ✓
          </small>
        )}
        {disabled && disabledReason && (
          <small className="disabled-reason">{disabledReason}</small>
        )}
      </div>
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
export function canEdit(field: Editable, item: Item, actor: string) {
  return ["received", "damageReceived", "damageReceivedMode"].includes(field)
    ? Boolean(item.location) && actor === item.location
    : actor === sender;
}
