import { test, expect } from "@playwright/test";
import { row, number, distribute } from "./helpers";

test("reserved hotel rows are red but can take more units from the green remainder", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "50");
  await distribute(row(page), { "Elba Carlota": "14", "Elba San Jorge": "10" });
  const rows = page.locator('tr[data-product-id="excel-row-2"]');
  const remainder = page.locator('tr[data-record-id="remainder:excel-row-2"]');
  const sanJorge = rows.filter({
    has: page
      .locator('td[data-label="Destino"] strong')
      .getByText("Elba San Jorge", { exact: true }),
  });
  await expect(rows).toHaveCount(3);
  await expect(rows.locator(".availability-no")).toHaveCount(2);
  await expect(row(page).locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Hotel asignado)",
  );
  await expect(remainder.locator(".availability-yes")).toHaveText(
    "DISPONIBLE (26 unidades disponibles)",
  );
  await expect(
    row(page).getByLabel("Unidades asignadas", { exact: true }),
  ).toBeEnabled();
  await number(row(page), "Unidades asignadas", "20");
  await expect(row(page).locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Hotel asignado)",
  );
  await expect(
    remainder.locator('td[data-label="Unidades asignadas"]'),
  ).toHaveText("20");
  await expect(remainder.locator(".availability-yes")).toHaveText(
    "DISPONIBLE (20 unidades disponibles)",
  );
  await expect(
    sanJorge.getByLabel("Unidades asignadas", { exact: true }),
  ).toHaveValue("10");
  await page.getByLabel("Filtrar ubicación").selectOption("Elba Carlota");
  await expect(rows).toHaveCount(1);
  await expect(row(page)).toContainText(
    "Puedes añadir hasta 20 unidades sin asignar.",
  );
  await number(row(page), "Unidades asignadas", "41");
  await expect(row(page).getByRole("alert")).toContainText("Máximo: 40");
  await number(row(page), "Unidades asignadas", "40");
  await page.getByLabel("Filtrar ubicación").selectOption("");
  await expect(remainder).toHaveCount(0);
  await expect(rows.locator(".availability-no")).toHaveCount(2);
  await page.reload();
  await expect(
    row(page).getByLabel("Unidades asignadas", { exact: true }),
  ).toHaveValue("40");
  await expect(rows.locator(".availability-no")).toHaveCount(2);
  await number(row(page), "Unidades asignadas", "39");
  await expect(remainder.locator(".availability-yes")).toHaveText(
    "DISPONIBLE (1 unidad disponible)",
  );
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("legacy hotel movements are reserved and a zero total never shows available", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "50");
  await number(row(page), "Enviadas", "40");
  await expect(row(page).locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Hotel asignado)",
  );
  await expect(row(page)).toContainText(
    "Puedes añadir hasta 10 unidades sin asignar.",
  );
  await number(row(page), "Enviadas", "");
  await number(row(page), "Total real disponible", "0");
  await expect(row(page).locator(".availability-no")).toHaveText(
    "NO DISPONIBLE (Sin unidades)",
  );
});
