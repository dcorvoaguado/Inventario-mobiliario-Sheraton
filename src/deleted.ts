import { key, type Item } from "./inventory";
export const deletedKey = `${key}-deleted`;
export function readDeleted(): Item[] {
  const value: unknown = JSON.parse(localStorage.getItem(deletedKey) ?? "[]");
  if (
    !Array.isArray(value) ||
    !value.every(
      (row) =>
        row && typeof row.id === "string" && typeof row.name === "string",
    )
  )
    throw Error("No se puede leer el mobiliario eliminado.");
  return value;
}
