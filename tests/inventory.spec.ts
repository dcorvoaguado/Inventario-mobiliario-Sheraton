import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("new records keep immutable identity, support search and export transfer fields", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("sheraton-inventory-v1", "[]"),
  );
  await page.reload();
  await page.getByRole("button", { name: "Añadir mobiliario" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Sillón lobby");
  await page
    .getByRole("combobox", { name: "Ubicación", exact: true })
    .selectOption("Elba Sara");
  await page.getByLabel("Unidades", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Guardar mobiliario" }).click();
  await page.reload();
  const row = page.locator("tbody tr");
  await expect(row.getByText("Sillón lobby", { exact: true })).toBeVisible();
  await expect(
    row.getByRole("button", { name: /Editar|Eliminar/ }),
  ).toHaveCount(0);
  await row.getByLabel("Inventario corregido", { exact: true }).fill("6");
  await row.getByLabel("Inventario corregido", { exact: true }).press("Enter");
  await row.getByLabel("Enviadas", { exact: true }).fill("2");
  await row.getByLabel("Enviadas", { exact: true }).press("Enter");
  await page.getByLabel("Buscar mobiliario").fill("mesa");
  await expect(page.getByText("No hay coincidencias")).toBeVisible();
  await page.getByLabel("Buscar mobiliario").fill("");
  await page.getByLabel("Filtrar estado").selectOption("Enviado");
  await expect(row).toHaveCount(1);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await pending;
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain("Inventariadas originales");
  expect(csv).toContain("Inventario corregido");
  expect(csv).toContain("Hotel Sheraton");
  const values = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sheraton-inventory-v1")!),
  );
  expect(values[0].quantity).toBe(4);
  expect(values[0].correctedQuantity).toBe(6);
});
test("preserves corrupted storage and blocks overwriting", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("sheraton-inventory-v1", "invalid json"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("No se puede leer");
  await expect(
    page.getByRole("button", { name: "Añadir mobiliario" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("sheraton-inventory-v1")),
  ).toBe("invalid json");
});
