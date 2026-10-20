import { test, expect } from "@playwright/test";
import { row, group, number, distribute } from "./helpers";
test("one distribution window plans quantities, computes remainder and rejects overflow", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "10");
  await distribute(row(page), { "Elba Sara": "5", "Elba Palace": "4" });
  const remainder = page.locator('tr[data-record-id="remainder:excel-row-2"]');
  await expect(
    remainder.locator('td[data-label="Unidades asignadas"]'),
  ).toHaveText("1");
  await expect(group(row(page))).toContainText("Asignadas 9");
  await expect(group(row(page))).toContainText("Sin asignar 1");
  await group(row(page))
    .getByRole("button", { name: "Repartir entre hoteles", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("checkbox", { name: "Elba San Jorge", exact: true }),
  ).toBeVisible();
  await dialog
    .getByLabel("Unidades para Elba Palace", { exact: true })
    .fill("6");
  await expect(dialog.getByRole("alert")).toContainText("supera el total");
  await expect(
    dialog.getByRole("button", { name: "Guardar reparto", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Unidades para Elba Palace", { exact: true })
    .fill("5");
  await dialog
    .getByRole("button", { name: "Guardar reparto", exact: true })
    .click();
  await expect(remainder).toHaveCount(0);
  await page.reload();
  await expect(group(row(page)).locator("tr[data-record-id]")).toHaveCount(2);
  await expect(
    group(row(page)).getByLabel("Total real disponible", { exact: true }),
  ).toHaveCount(1);
});
test("recovery restores only checked rows and leaves other deleted furniture available", async ({
  page,
}) => {
  await page.goto("/");
  for (const id of ["excel-row-2", "excel-row-3"])
    await row(page, id).getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Eliminar mobiliario", exact: true })
    .click();
  await page.getByRole("button", { name: "Sí, eliminar mobiliario" }).click();
  await page
    .getByRole("button", {
      name: "Recuperar mobiliario eliminado (2)",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar seleccionados", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Recuperar Sillón tapizado · Elba Carlota", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Recuperar seleccionados", exact: true })
    .click();
  await page.reload();
  await expect(row(page)).toHaveCount(1);
  await expect(row(page, "excel-row-3")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Recuperar mobiliario eliminado (1)",
      exact: true,
    })
    .click();
  await page.getByLabel("Seleccionar todos los eliminados").check();
  await page
    .getByRole("button", { name: "Recuperar seleccionados", exact: true })
    .click();
  await expect(row(page, "excel-row-3")).toHaveCount(1);
});
