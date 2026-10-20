import { Count, Damage, canEdit, type Editable } from "./InlineFields";
import { allocation, productKey, productRows } from "./allocation";
import {
  displayCount,
  imageUrl,
  sender,
  transferStatus,
  type Item,
} from "./inventory";
export default function InventoryTable({
  items,
  visible,
  actor,
  loadError,
  selected,
  onSelect,
  onChange,
  onManage,
  onPhoto,
  errors,
}: {
  items: Item[];
  visible: Item[];
  actor: string;
  loadError: boolean;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onChange: (
    item: Item,
    field: Editable,
    value: string | number | null,
  ) => boolean;
  onManage: (item: Item) => void;
  onPhoto: (item: Item) => void;
  errors: Record<string, string>;
}) {
  const groups = [...new Set(visible.map(productKey))].map((key) =>
    visible.filter((i) => productKey(i) === key),
  );
  const senderReason =
    actor !== sender ? "Selecciona Hotel Sheraton para editar." : undefined;
  return (
    <div className="table-scroll grouped-scroll">
      <table className="editable-table grouped-table">
        <colgroup>
          {[5, 20, 11, 12, 13, 12, 15, 12].map((width, index) => (
            <col key={index} style={{ width: `${width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="block-headings">
            <th colSpan={3} className="block-base">
              Reparto por hotel
            </th>
            <th colSpan={2} className="block-sender block-start">
              Hotel origen · Sheraton
            </th>
            <th colSpan={2} className="block-receiver block-start">
              Hotel destino
            </th>
            <th className="block-status block-start">Común</th>
          </tr>
          <tr>
            <th className="block-base">
              <span className="sr-only">Seleccionar</span>
            </th>
            <th className="block-base">Destino</th>
            <th className="block-base">Unidades asignadas</th>
            <th className="block-sender block-start">Enviadas</th>
            <th className="block-sender">Rotura envío</th>
            <th className="block-receiver block-start">Recibidas</th>
            <th className="block-receiver">Rotura recepción</th>
            <th className="block-status block-start">Estado</th>
          </tr>
        </thead>
        {groups.map((visibleRows) => {
          const base =
            productRows(items, visibleRows[0]).find((i) => !i.isRemainder) ??
            visibleRows[0];
          const a = allocation(items, base);
          const named = a.rows.filter((i) => i.location && !i.isRemainder);
          const assigned = named.reduce(
            (sum, i) => sum + (i.allocatedQuantity ?? 0),
            0,
          );
          const pending = named.filter(
            (i) => i.allocatedQuantity == null,
          ).length;
          const remaining =
            a.limit === null ? null : Math.max(0, a.limit - assigned);
          return (
            <tbody key={productKey(base)} data-product-group={productKey(base)}>
              <tr className="product-heading">
                <td colSpan={8}>
                  <div className="product-overview">
                    <button
                      className="photo-button"
                      onClick={() => onPhoto(base)}
                      aria-label={`Ver foto de ${base.name}`}
                    >
                      {base.image ? (
                        <img src={imageUrl(base.image)} alt={base.name} />
                      ) : (
                        <span>Sin imagen</span>
                      )}
                    </button>
                    <div className="product-title">
                      <h3>{base.name}</h3>
                      <small>
                        Origen: {base.origin || "Pendiente"} · Inventario
                        original: {displayCount(base.quantity)}
                      </small>
                    </div>
                    <div className="shared-total">
                      <span>Total real disponible</span>
                      <Count
                        label="Total real disponible"
                        value={a.limit}
                        disabled={loadError || actor !== sender}
                        disabledReason={senderReason}
                        error={errors[`${base.id}:correctedQuantity`]}
                        onSave={(value) =>
                          onChange(base, "correctedQuantity", value)
                        }
                      />
                      <small>Compartido entre todos los hoteles</small>
                    </div>
                    <div className="product-progress">
                      <span>
                        Asignadas <strong>{assigned}</strong>
                      </span>
                      <span>
                        Sin asignar <strong>{displayCount(remaining)}</strong>
                      </span>
                      <span>
                        Enviadas <strong>{a.sent}</strong>
                      </span>
                      <span>
                        Pendientes de enviar{" "}
                        <strong>
                          {pending > 0
                            ? "Por completar"
                            : Math.max(0, assigned - a.sent)}
                        </strong>
                      </span>
                      {pending > 0 && (
                        <small>
                          Reparto por completar: {pending}{" "}
                          {pending === 1 ? "hotel" : "hoteles"}
                        </small>
                      )}
                      {a.conflict && (
                        <small className="field-error">
                          Unifica el total real disponible para este mueble.
                        </small>
                      )}
                    </div>
                    <button
                      className="distribute-button"
                      disabled={loadError || actor !== sender}
                      onClick={() => onManage(base)}
                    >
                      Repartir entre hoteles
                    </button>
                  </div>
                </td>
              </tr>
              {visibleRows.map((i) => {
                const receiverReason = !i.location
                  ? "Asigna un hotel para registrar la recepción."
                  : actor !== i.location
                    ? `Selecciona ${i.location} como hotel que registra para completar la recepción.`
                    : undefined;
                const sentMax =
                  a.limit === null
                    ? (i.allocatedQuantity ?? undefined)
                    : Math.max(
                        0,
                        Math.min(
                          i.allocatedQuantity ?? a.limit,
                          a.limit - a.sent + (i.sent ?? 0),
                        ),
                      );
                const planMax =
                  a.limit === null
                    ? undefined
                    : Math.max(
                        0,
                        a.limit - assigned + (i.allocatedQuantity ?? 0),
                      );
                return (
                  <tr
                    key={i.id}
                    data-record-id={i.id}
                    data-product-id={productKey(i)}
                    className={`${selected.has(i.id) ? "selected-item" : ""} ${i.isRemainder ? "remainder-row" : ""}`}
                  >
                    <td className="block-base" data-label="Seleccionar">
                      <input
                        type="checkbox"
                        className="item-selection"
                        aria-label={`Seleccionar ${i.name} · ${i.location || "Sin hotel asignado"}`}
                        disabled={loadError || !!i.isRemainder}
                        checked={selected.has(i.id)}
                        onChange={() => onSelect(i.id)}
                      />
                    </td>
                    <td className="block-base" data-label="Destino">
                      <strong>{i.location || "Sin hotel asignado"}</strong>
                      {i.isRemainder && (
                        <small>
                          Se calcula con las unidades que quedan por repartir.
                        </small>
                      )}
                    </td>
                    <td className="block-base" data-label="Unidades asignadas">
                      {i.isRemainder || !i.location ? (
                        <strong>
                          {displayCount(i.allocatedQuantity ?? null)}
                        </strong>
                      ) : (
                        <Count
                          label="Unidades asignadas"
                          value={i.allocatedQuantity ?? null}
                          max={planMax}
                          disabled={loadError || actor !== sender}
                          disabledReason={senderReason}
                          error={errors[`${i.id}:allocatedQuantity`]}
                          onSave={(value) =>
                            onChange(i, "allocatedQuantity", value)
                          }
                        />
                      )}
                    </td>
                    <td
                      className="block-sender block-start"
                      data-label="Enviadas · Sheraton"
                    >
                      <Count
                        label="Enviadas"
                        value={i.sent}
                        max={sentMax}
                        disabled={
                          loadError || actor !== sender || !!i.isRemainder
                        }
                        disabledReason={
                          i.isRemainder
                            ? "Pendiente de asignar hotel."
                            : senderReason
                        }
                        error={errors[`${i.id}:sent`]}
                        onSave={(value) => onChange(i, "sent", value)}
                      />
                      {i.sent !== null && (
                        <small>
                          {i.sentBy
                            ? `Comprobado por ${i.sentBy}`
                            : "Registro anterior sin responsable identificado"}
                        </small>
                      )}
                    </td>
                    <td className="block-sender" data-label="Rotura envío">
                      <Damage
                        item={i}
                        side="Sent"
                        disabled={
                          loadError || actor !== sender || !!i.isRemainder
                        }
                        change={(field, value) => onChange(i, field, value)}
                      />
                      {senderReason && <small>{senderReason}</small>}
                      {i.recycled !== null && (
                        <small>
                          Rotura anterior sin responsable: {i.recycled}
                        </small>
                      )}
                    </td>
                    <td
                      className="block-receiver block-start"
                      data-label="Recibidas · destino"
                    >
                      <Count
                        label="Recibidas"
                        value={i.received}
                        max={i.sent ?? 0}
                        disabled={loadError || !canEdit("received", i, actor)}
                        disabledReason={receiverReason}
                        error={errors[`${i.id}:received`]}
                        onSave={(value) => onChange(i, "received", value)}
                      />
                      {i.receivedBy && (
                        <small>Comprobado por {i.receivedBy}</small>
                      )}
                    </td>
                    <td
                      className="block-receiver"
                      data-label="Rotura recepción"
                    >
                      <Damage
                        item={i}
                        side="Received"
                        disabled={
                          loadError || !canEdit("damageReceived", i, actor)
                        }
                        change={(field, value) => onChange(i, field, value)}
                      />
                      {receiverReason && <small>{receiverReason}</small>}
                    </td>
                    <td
                      className="block-status block-start"
                      data-label="Estado"
                    >
                      <span
                        className={`badge transfer-${transferStatus(i).toLowerCase()}`}
                      >
                        {transferStatus(i)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
