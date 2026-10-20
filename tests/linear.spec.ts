import { test, expect } from "@playwright/test";
test("linear rows keep furniture and every editing field together and preserve shared stock", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.locator('tr[data-record-id="excel-row-2"]');
  await expect(page.locator(".product-heading")).toHaveCount(0);
  await expect(first).toContainText("Sillón tapizado");
  await expect(first.getByRole("img")).toHaveCount(1);
  await first.getByLabel("Total real disponible", { exact: true }).fill("10");
  await first
    .getByLabel("Total real disponible", { exact: true })
    .press("Enter");
  await first
    .getByRole("button", { name: "Repartir entre hoteles", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Unidades para Elba Carlota", { exact: true })
    .fill("5");
  await dialog
    .getByRole("checkbox", { name: "Elba Sara", exact: true })
    .check();
  await dialog.getByLabel("Unidades para Elba Sara", { exact: true }).fill("4");
  await dialog
    .getByRole("button", { name: "Guardar reparto", exact: true })
    .click();
  const rows = page.locator('tr[data-product-id="excel-row-2"]');
  await expect(rows).toHaveCount(3);
  await expect(
    page
      .locator('tr[data-record-id="remainder:excel-row-2"]')
      .locator('td[data-label="Unidades asignadas"]'),
  ).toHaveText("1");
  await first.getByLabel("Enviadas", { exact: true }).fill("5");
  await first.getByLabel("Enviadas", { exact: true }).press("Enter");
  await page
    .getByLabel("Hotel que registra", { exact: true })
    .selectOption("Elba Carlota");
  await first.getByLabel("Recibidas", { exact: true }).fill("6");
  await first.getByLabel("Recibidas", { exact: true }).press("Enter");
  await expect(first.getByRole("alert")).toContainText("Máximo: 5");
  await page.reload();
  await expect(rows).toHaveCount(3);
  await expect(
    first.getByLabel("Total real disponible", { exact: true }),
  ).toHaveValue("10");
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
