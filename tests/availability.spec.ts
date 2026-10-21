import { test, expect } from "@playwright/test";
import { row, number, distribute } from "./helpers";

test("availability follows the whole allocation across duplicate rows and filters", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "50");
  await distribute(row(page), { "Elba Carlota": "25", "Elba Sara": "15" });
  const rows = page.locator('tr[data-product-id="excel-row-2"]');
  await expect(rows).toHaveCount(3);
  await expect(rows.locator(".availability-yes")).toHaveCount(3);
  for (const label of await rows.locator(".availability-label").all())
    await expect(label).toHaveText("DISPONIBLE (10 unidades disponibles)");
  await page.getByLabel("Filtrar ubicación").selectOption("Elba Sara");
  await expect(rows).toHaveCount(1);
  await expect(rows.locator(".availability-label")).toHaveText(
    "DISPONIBLE (10 unidades disponibles)",
  );
  await number(rows, "Unidades asignadas", "25");
  await expect(rows.locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Hotel asignado)",
  );
  await page.getByLabel("Filtrar ubicación").selectOption("");
  await expect(rows).toHaveCount(2);
  await expect(rows.locator(".availability-no")).toHaveCount(2);
  await number(row(page), "Enviadas", "5");
  await expect(row(page).locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Hotel asignado)",
  );
  await page.reload();
  await expect(rows.locator(".availability-no")).toHaveCount(2);
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("legacy shipments reserve stock and zero stock is not advertised as available", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "50");
  await number(row(page), "Enviadas", "40");
  await expect(row(page).locator(".availability-yes")).toHaveText(
    "DISPONIBLE (10 unidades disponibles)",
  );
  await number(row(page), "Enviadas", "50");
  await expect(row(page).locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Hotel asignado)",
  );
  await number(row(page), "Enviadas", "");
  await number(row(page), "Total real disponible", "0");
  await expect(row(page).locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Sin unidades)",
  );
});
