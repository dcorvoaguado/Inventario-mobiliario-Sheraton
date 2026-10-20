import imported from "./data/inventory.json";
export type Item = {
  id: string;
  name: string;
  origin: string;
  location: string;
  category: string;
  quantity: number | null;
  inventoryGroup?: string;
  sent: number | null;
  received: number | null;
  recycled: number | null;
  correctedQuantity?: number | null;
  damageSent?: number | null;
  damageReceived?: number | null;
  damageSentMode?: string;
  damageReceivedMode?: string;
  sentBy?: string | null;
  receivedBy?: string | null;
  condition: string;
  notes: string;
  image?: string | null;
  source?: {
    sheet: string;
    row: number;
    cells: Record<string, string | number | null>;
    formulas: Partial<Record<string, string>>;
  };
};
export const initialInventory: Item[] = imported;
export const key = "sheraton-inventory-v1";
export const conditions = [
  "Sin evaluar",
  "Buen estado",
  "Revisar",
  "Fuera de servicio",
];
export const validCount = (value: unknown): value is number | null =>
  value === null ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
export function read(): Item[] {
  const raw = localStorage.getItem(key);
  if (raw === null) return structuredClone(initialInventory);
  const data: unknown = JSON.parse(raw);
  if (
    !Array.isArray(data) ||
    !data.every(
      (i) =>
        i &&
        typeof i.id === "string" &&
        typeof i.name === "string" &&
        typeof i.location === "string" &&
        typeof i.category === "string" &&
        typeof i.notes === "string" &&
        validCount(i.quantity) &&
        conditions.includes(i.condition) &&
        [
          "sent",
          "received",
          "recycled",
          "correctedQuantity",
          "damageSent",
          "damageReceived",
        ].every((k) => i[k] === undefined || validCount(i[k])) &&
        (i.origin === undefined || typeof i.origin === "string") &&
        (i.image === undefined ||
          i.image === null ||
          typeof i.image === "string") &&
        (i.source === undefined ||
          (typeof i.source.sheet === "string" &&
            Number.isSafeInteger(i.source.row) &&
            typeof i.source.formulas === "object" &&
            i.source.formulas !== null)),
    )
  )
    throw Error("Invalid inventory");
  if (new Set(data.map((i) => i.id)).size !== data.length)
    throw Error("Duplicate record identifiers");
  return data.map((i) => {
    const original = initialInventory.find((row) => row.id === i.id);
    return {
      ...i,
      quantity: original ? original.quantity : i.quantity,
      inventoryGroup: original?.inventoryGroup ?? i.inventoryGroup,
      correctedQuantity:
        i.correctedQuantity !== undefined
          ? i.correctedQuantity
          : original && original.quantity !== i.quantity
            ? i.quantity
            : null,
      origin: original ? original.origin : (i.origin ?? ""),
      name: original ? original.name : i.name,
      image: original ? original.image : i.image,
      source: original?.source ?? i.source,
      sent: i.sent ?? null,
      received: i.received ?? null,
      recycled: i.recycled ?? null,
      damageSent: i.damageSent ?? null,
      damageReceived: i.damageReceived ?? null,
    };
  });
}
export const empty = (): Item => ({
  id: crypto.randomUUID(),
  name: "",
  origin: "",
  location: "",
  category: "Asientos",
  quantity: 1,
  sent: null,
  received: null,
  recycled: null,
  condition: "Sin evaluar",
  notes: "",
});
export const imageUrl = (image: string) =>
  image.startsWith("data:image/jpeg;base64,")
    ? image
    : import.meta.env.BASE_URL + image;
export const displayCount = (value: number | null) =>
  value === null ? "Pendiente" : value.toLocaleString("es-ES");

export const destinations = [
  "Elba Carlota",
  "Elba Sara",
  "Elba Lucía",
  "Elba Palace",
];
export const sender = "Hotel Sheraton";
export function transferStatus(item: Item) {
  return item.received !== null
    ? "Recibido"
    : item.sent !== null
      ? "Enviado"
      : "Pendiente";
}
export function effectiveQuantity(item: Item) {
  return item.correctedQuantity ?? item.quantity;
}

export function inventoryTotal(items: Item[]) {
  return [
    ...new Map(
      items.map((i) => [i.inventoryGroup ?? i.id, i.quantity]),
    ).values(),
  ].reduce<number>((sum, quantity) => sum + (quantity ?? 0), 0);
}

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .toLocaleLowerCase("es")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
