import { destinations, initialInventory, type Item } from "./inventory";
export const productKey = (item: Item) =>
  item.inventoryGroup ?? item.distributionOf ?? item.id;
export const productRows = (items: Item[], item: Item) =>
  items.filter((i) => productKey(i) === productKey(item));
export function hasMovement(item: Item) {
  return (
    [
      item.sent,
      item.received,
      item.damageSent,
      item.damageReceived,
      item.recycled,
    ].some((n) => n != null) ||
    item.damageSentMode === "damaged" ||
    item.damageReceivedMode === "damaged"
  );
}
export function allocation(items: Item[], item: Item) {
  const rows = productRows(items, item);
  const corrections = [
    ...new Set(
      rows
        .map((i) => i.correctedQuantity)
        .filter((n): n is number => n != null),
    ),
  ];
  const originals = rows
    .map((i) => i.quantity)
    .filter((n): n is number => n !== null);
  return {
    rows,
    conflict: corrections.length > 1,
    limit: corrections.length
      ? Math.min(...corrections)
      : originals.length
        ? Math.min(...originals)
        : null,
    sent: rows.reduce((n, i) => n + (i.sent ?? 0), 0),
    received: rows.reduce((n, i) => n + (i.received ?? 0), 0),
  };
}
export function allocationError(items: Item[], item: Item) {
  const a = allocation(items, item);
  const assigned = a.rows.filter((row) => !row.isRemainder && row.location);
  const planned = assigned.reduce(
    (sum, row) => sum + (row.allocatedQuantity ?? 0),
    0,
  );
  if (a.limit !== null && planned > a.limit)
    return `Las unidades asignadas suman ${planned} y superan el total disponible de ${a.limit}.`;
  if (a.limit === null && planned > 0)
    return "Indica el total real disponible antes de repartir cantidades.";
  const overPlan = assigned.find(
    (row) =>
      row.allocatedQuantity != null && (row.sent ?? 0) > row.allocatedQuantity,
  );
  if (overPlan)
    return `Las enviadas de ${overPlan.location} no pueden superar las ${overPlan.allocatedQuantity} unidades asignadas.`;
  if (a.conflict)
    return "Hay totales reales disponibles diferentes para este mueble. Introduce una cantidad común antes de repartirlo.";
  if (a.limit === null && (a.sent > 0 || a.received > 0))
    return "Indica el total real disponible antes de registrar cantidades para este mueble.";
  if (a.limit !== null && a.sent > a.limit)
    return `Las enviadas entre todos los hoteles suman ${a.sent} y superan el total disponible de ${a.limit}.`;
  const excessiveReceipt = a.rows.find(
    (row) => (row.received ?? 0) > (row.sent ?? 0),
  );
  if (excessiveReceipt)
    return `Las recibidas de ${excessiveReceipt.location} no pueden superar las ${excessiveReceipt.sent ?? 0} unidades enviadas a ese hotel.`;
  if (a.limit !== null && a.received > a.limit)
    return `Las recibidas entre todos los hoteles suman ${a.received} y superan el total disponible de ${a.limit}.`;
  return null;
}
export function replaceDestinations(
  items: Item[],
  item: Item,
  desired: string[],
) {
  const a = allocation(items, item),
    key = productKey(item);
  const hotels = [...new Set(desired)];
  if (!hotels.length) throw Error("Selecciona al menos un hotel destino.");
  if (
    hotels.some(
      (h) => !destinations.includes(h) && !a.rows.some((i) => i.location === h),
    )
  )
    throw Error("Elige uno de los hoteles permitidos.");
  if (a.conflict)
    throw Error(
      "Unifica el total real disponible antes de seleccionar destinos.",
    );
  const removed = a.rows.filter(
    (i) => !i.isRemainder && !hotels.includes(i.location),
  );
  if (removed.some(hasMovement))
    throw Error(
      "No se puede quitar un destino con envíos, recepción o roturas registrados. Retira primero esos datos.",
    );
  const reusable = removed.filter((i) => !hasMovement(i));
  const output: Item[] = [];
  for (const hotel of hotels) {
    const existing = a.rows.filter((i) => i.location === hotel);
    const active = existing.filter(hasMovement);
    if (active.length > 1)
      throw Error(
        "Este destino tiene varias filas con movimientos registrados. Revisa esas filas antes de reorganizarlas.",
      );
    let row = active[0] ?? existing[0];
    if (!row) {
      const reusableRow = reusable.shift();
      row = {
        ...item,
        id: reusableRow?.id ?? crypto.randomUUID(),
        distributionOf:
          reusableRow?.distributionOf ?? item.distributionOf ?? item.id,
        allocatedQuantity: null,
        isRemainder: false,
        sent: null,
        received: null,
        recycled: null,
        damageSent: null,
        damageReceived: null,
        damageSentMode: "pending",
        damageReceivedMode: "pending",
        sentBy: null,
        receivedBy: null,
      };
    }
    output.push({
      ...row,
      location: hotel,
      inventoryGroup: key,
      correctedQuantity:
        a.rows.find((i) => i.correctedQuantity != null)?.correctedQuantity ??
        null,
    });
  }
  let inserted = false;
  const next: Item[] = [];
  for (const row of items) {
    if (productKey(row) !== key) {
      next.push(row);
      continue;
    }
    if (!inserted) {
      next.push(...output);
      inserted = true;
    }
  }
  const error = allocationError(next, output[0]);
  if (error) throw Error(error);
  return next;
}
export function resetAllocationSelection(items: Item[], selected: Set<string>) {
  const keys = [
    ...new Set(items.filter((i) => selected.has(i.id)).map(productKey)),
  ];
  let next = [...items];
  for (const key of keys) {
    const rows = next.filter((i) => productKey(i) === key);
    const all = rows.every((i) => selected.has(i.id));
    if (all) {
      const baseline = initialInventory.filter((i) => productKey(i) === key);
      let inserted = false;
      next = next.flatMap((i) => {
        if (productKey(i) !== key) return [i];
        if (inserted) return [];
        inserted = true;
        return structuredClone(baseline);
      });
    } else {
      next = next.flatMap((i) => {
        if (!selected.has(i.id) || productKey(i) !== key) return [i];
        const original = initialInventory.find((base) => base.id === i.id);
        return original
          ? [
              {
                ...structuredClone(original),
                location: i.location,
                inventoryGroup: key,
                correctedQuantity: i.correctedQuantity ?? null,
              },
            ]
          : [];
      });
    }
  }
  return next;
}

// A remainder is calculated from the shared stock, never copied as another lot.
export function syncRemainders(items: Item[]): Item[] {
  let next = items.filter((row) => !row.isRemainder);
  for (const key of new Set(next.map(productKey))) {
    const rows = next.filter((row) => productKey(row) === key);
    if (!rows.some((row) => row.allocatedQuantity != null)) continue;
    const named = rows.filter((row) => row.location);
    const a = allocation(next, rows[0]);
    if (a.limit === null) continue;
    const remaining = Math.max(
      0,
      a.limit -
        named.reduce((sum, row) => sum + (row.allocatedQuantity ?? 0), 0),
    );
    const unassigned = rows.find((row) => !row.location);
    if (unassigned) {
      next = next.map((row) =>
        row.id === unassigned.id
          ? { ...row, allocatedQuantity: remaining }
          : row,
      );
    } else if (remaining > 0) {
      const base = rows[0];
      const remainder: Item = {
        ...base,
        id: `remainder:${key}`,
        inventoryGroup: key,
        distributionOf: base.distributionOf ?? base.id,
        isRemainder: true,
        location: "",
        allocatedQuantity: remaining,
        sent: null,
        received: null,
        damageSent: null,
        damageReceived: null,
        damageSentMode: "pending",
        damageReceivedMode: "pending",
        sentBy: null,
        receivedBy: null,
        recycled: null,
        notes: "",
      };
      const last = next.map(productKey).lastIndexOf(key);
      next.splice(last + 1, 0, remainder);
    }
  }
  return next;
}
