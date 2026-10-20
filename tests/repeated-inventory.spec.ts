import { test, expect } from "@playwright/test";
test("repeated inventory uses the previous amount and spreadsheet coordinates stay hidden", async ({
  page,
}) => {
  await page.goto("/");
  for (const [id, quantity] of [
    ["excel-row-22", "60"],
    ["excel-row-38", "260"],
    ["excel-row-57", "50"],
    ["excel-row-61", "100"],
  ]) {
    const row = page.locator(`tbody tr[data-record-id="${id}"]`);
    await expect(row.locator("td").nth(3).locator("strong")).toHaveText(
      quantity,
    );
  }
  await expect(page.locator("tbody")).not.toContainText(
    /Fila \d|Fórmula original/,
  );
  await page.getByRole("button", { name: "Galería de fotos" }).click();
  await expect(page.locator(".gallery")).not.toContainText(/Fila \d/);
  await page
    .getByRole("button", { name: "Ver foto de Sillón tapizado", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText(/fila|Hoja1|=I/i);
});
test("existing local corrections and transfer fields survive the updated baseline", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "sheraton-inventory-v1",
      JSON.stringify([
        {
          id: "excel-row-22",
          name: "Silla ratán",
          origin: "SHERATON",
          location: "Elba Lucía",
          category: "Distribución inicial",
          quantity: null,
          correctedQuantity: 58,
          sent: 55,
          received: null,
          recycled: null,
          condition: "Sin evaluar",
          notes: "Conservar",
        },
      ]),
    );
  });
  await page.reload();
  const row = page.locator("tbody tr");
  await expect(row.locator("td").nth(3).locator("strong")).toHaveText("60");
  await expect(
    row.getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("58");
  await expect(row.getByLabel("Enviadas", { exact: true })).toHaveValue("55");
  await expect(row).not.toContainText("Fila");
});
