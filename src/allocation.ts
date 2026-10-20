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
  if (a.conflict)
    return "Hay inventarios corregidos diferentes para este mueble. Introduce una cantidad común antes de repartirlo.";
  if (a.limit === null && (a.sent > 0 || a.received > 0))
    return "Indica el inventario corregido antes de registrar cantidades para este mueble.";
  if (a.limit !== null && a.sent > a.limit)
    return `Las enviadas entre todos los hoteles suman ${a.sent} y superan el inventario disponible de ${a.limit}.`;
  if (a.limit !== null && a.received > a.limit)
    return `Las recibidas entre todos los hoteles suman ${a.received} y superan el inventario disponible de ${a.limit}.`;
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
      "Unifica el inventario corregido antes de seleccionar destinos.",
    );
  const removed = a.rows.filter((i) => !hotels.includes(i.location));
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
