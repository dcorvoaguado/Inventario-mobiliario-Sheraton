import { test, expect } from "@playwright/test";
import { row, group, number, distribute, destinationRow } from "./helpers";
test("repartition is atomic, grouped and persists with a shared stock ceiling", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "60");
  await distribute(row(page), { "Elba Carlota": "40", "Elba Sara": "20" });
  await expect(
    page.locator('tbody[data-product-group="excel-row-2"]'),
  ).toHaveCount(1);
  await expect(group(row(page)).locator(".product-heading")).toHaveCount(0);
  const sara = destinationRow(page, "Elba Sara")
    .filter({ has: page.getByLabel("Unidades asignadas", { exact: true }) })
    .filter({ has: page.locator('input[value="20"]') });
  const carlota = row(page);
  await number(carlota, "Enviadas", "40");
  await number(sara, "Enviadas", "20");
  await expect(group(carlota)).toContainText("Sin asignar: 0");
  await number(sara, "Enviadas", "21");
  await expect(sara.getByRole("alert")).toContainText("Máximo: 20");
  await number(carlota, "Total real disponible", "59");
  await expect(
    group(carlota)
      .locator('td[data-label="Total real disponible"]')
      .first()
      .getByRole("alert"),
  ).toContainText("superan");
  await page.reload();
  await expect(
    row(page).getByLabel("Total real disponible", { exact: true }),
  ).toHaveValue("60");
  await expect(row(page).getByLabel("Enviadas", { exact: true })).toHaveValue(
    "40",
  );
  await expect(row(page).getByRole("img")).toHaveCount(1);
});
test("hotel with movements stays selected and shipments cap each receipt", async ({
  page,
}) => {
  await page.goto("/");
  await distribute(row(page), { "Elba Carlota": "35" });
  await number(row(page), "Enviadas", "35");
  await row(page)
    .getByRole("button", { name: "Repartir entre hoteles", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("checkbox", { name: /Elba Carlota/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(row(page)).toContainText(
    "Selecciona Elba Carlota como hotel que registra",
  );
  await page
    .getByLabel("Hotel que registra", { exact: true })
    .selectOption("Elba Carlota");
  await number(row(page), "Recibidas", "36");
  await expect(row(page).getByRole("alert")).toContainText("Máximo: 35");
  await number(row(page), "Recibidas", "35");
  await expect(row(page)).toContainText("Recibido");
  await page
    .getByLabel("Hotel que registra", { exact: true })
    .selectOption("Hotel Sheraton");
  await number(row(page), "Enviadas", "34");
  await expect(row(page).getByRole("alert")).toContainText("no pueden superar");
  await expect(row(page).getByLabel("Enviadas", { exact: true })).toHaveValue(
    "35",
  );
});
test("shared limits include repeated source rows outside the filter and corrections may go up or down", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "40");
  await expect(
    row(page).getByLabel("Total real disponible", { exact: true }),
  ).toHaveValue("40");
  await number(row(page), "Total real disponible", "70");
  await expect(
    row(page).getByLabel("Total real disponible", { exact: true }),
  ).toHaveValue("70");
  await number(row(page, "excel-row-21"), "Enviadas", "40");
  await page.getByLabel("Filtrar ubicación").selectOption("Elba Lucía");
  const repeated = row(page, "excel-row-22");
  await number(repeated, "Enviadas", "21");
  await expect(repeated.getByRole("alert")).toContainText("Máximo: 20");
});

test("reassigning reservations is atomic and cancellation keeps previous values", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "10");
  await distribute(row(page), { "Elba Carlota": "6", "Elba Sara": "4" });
  await distribute(row(page), { "Elba Carlota": "4", "Elba Sara": "6" });
  await expect(
    row(page).getByLabel("Unidades asignadas", { exact: true }),
  ).toHaveValue("4");
  await row(page)
    .getByRole("button", { name: "Repartir entre hoteles", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Unidades para Elba Carlota", { exact: true })
    .fill("2");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    row(page).getByLabel("Unidades asignadas", { exact: true }),
  ).toHaveValue("4");
  await page.reload();
  await expect(
    row(page).getByLabel("Unidades asignadas", { exact: true }),
  ).toHaveValue("4");
});
