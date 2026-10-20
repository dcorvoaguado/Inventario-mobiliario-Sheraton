import { test, expect, type Locator } from "@playwright/test";
async function count(row: Locator, name: string, value: string) {
  const input = row.getByLabel(name, { exact: true });
  await input.fill(value);
  await input.press("Enter");
}
test("planned quantities create only the exact unassigned remainder and enforce stock", async ({
  page,
}) => {
  await page.goto("/");
  const original = page.locator('tbody tr[data-record-id="excel-row-2"]');
  await original
    .getByRole("button", { name: /Seleccionar varios hoteles/ })
    .click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("checkbox", { name: "Elba San Jorge", exact: true }),
  ).toBeVisible();
  await modal
    .getByRole("checkbox", { name: "Elba Carlota", exact: true })
    .uncheck();
  await modal.getByRole("checkbox", { name: "Elba Sara", exact: true }).check();
  await modal
    .getByRole("checkbox", { name: "Elba Palace", exact: true })
    .check();
  await modal.getByRole("button", { name: "Aplicar destinos" }).click();
  const rows = page.locator('tbody tr[data-product-id="excel-row-2"]');
  const sara = rows.filter({
    has: page.locator('option:checked[value="Elba Sara"]'),
  });
  const palace = rows.filter({
    has: page.locator('option:checked[value="Elba Palace"]'),
  });
  const remainder = page.locator(
    'tbody tr[data-record-id="remainder:excel-row-2"]',
  );
  await count(sara, "Inventario corregido", "10");
  await count(sara, "Cantidades necesarias", "5");
  await count(palace, "Cantidades necesarias", "4");
  await expect(rows).toHaveCount(3);
  await expect(
    remainder.locator('td[data-label="Cantidades necesarias"] strong'),
  ).toHaveText("1");
  await expect(sara).toContainText(
    "(Total mobiliario a repartir entre hoteles)",
  );
  await count(palace, "Cantidades necesarias", "6");
  await expect(page.getByRole("alert")).toContainText(
    "cantidades necesarias suman 11",
  );
  await expect(
    palace.getByLabel("Cantidades necesarias", { exact: true }),
  ).toHaveValue("4");
  await count(sara, "Enviadas", "6");
  await expect(page.getByRole("alert")).toContainText("5 unidades necesarias");
  await page.reload();
  await expect(
    remainder.locator('td[data-label="Cantidades necesarias"] strong'),
  ).toHaveText("1");
  await count(palace, "Cantidades necesarias", "5");
  await expect(remainder).toHaveCount(0);
  await count(palace, "Cantidades necesarias", "4");
  await remainder
    .getByLabel("Destino", { exact: true })
    .selectOption("Elba San Jorge");
  const sanJorge = rows.filter({
    has: page.locator('option:checked[value="Elba San Jorge"]'),
  });
  await expect(
    sanJorge.getByLabel("Cantidades necesarias", { exact: true }),
  ).toHaveValue("1");
  await expect(remainder).toHaveCount(0);
  for (const width of [1440, 1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
test("recovery restores only checked rows and keeps others available", async ({
  page,
}) => {
  await page.goto("/");
  for (const id of ["excel-row-2", "excel-row-3"])
    await page
      .locator(`tbody tr[data-record-id="${id}"]`)
      .getByRole("checkbox")
      .check();
  await page
    .getByRole("button", { name: "Borrar mobiliario", exact: true })
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
  await expect(
    page.locator('tbody tr[data-record-id="excel-row-2"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('tbody tr[data-record-id="excel-row-3"]'),
  ).toHaveCount(0);
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
  await expect(
    page.locator('tbody tr[data-record-id="excel-row-3"]'),
  ).toHaveCount(1);
});
