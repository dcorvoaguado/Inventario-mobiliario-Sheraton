import { test, expect } from "@playwright/test";
test("create, persist, search, edit, export and delete inventory", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Añadir mobiliario" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Sillón lobby");
  await page.getByLabel("Ubicación", { exact: true }).fill("Lobby");
  await page.getByLabel("Unidades", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Guardar mobiliario" }).click();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "Sillón lobby Asientos" }),
  ).toBeVisible();
  await page.getByLabel("Buscar mobiliario").fill("mesa");
  await expect(page.getByText("No hay coincidencias")).toBeVisible();
  await page.getByLabel("Buscar mobiliario").fill("");
  await page.getByRole("button", { name: "Editar Sillón lobby" }).click();
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("Revisar");
  await page.getByRole("button", { name: "Guardar mobiliario" }).click();
  await page.getByLabel("Filtrar estado").selectOption("Buen estado");
  await expect(page.getByText("No hay coincidencias")).toBeVisible();
  await page.getByLabel("Filtrar estado").selectOption("Revisar");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await download).suggestedFilename()).toBe("inventario-sheraton.csv");
  await page.getByRole("button", { name: "Eliminar Sillón lobby" }).click();
  await page.getByRole("button", { name: "Confirmar eliminación" }).click();
  await page.reload();
  await expect(
    page.getByText("Un inventario comienza con una pieza"),
  ).toBeVisible();
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
