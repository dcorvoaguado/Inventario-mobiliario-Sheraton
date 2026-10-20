import { test, expect, type Page, type Locator } from "@playwright/test";
const original = (page: Page) =>
  page.locator('tbody tr[data-record-id="excel-row-2"]');
const group = (page: Page) =>
  page.locator('tbody tr[data-product-id="excel-row-2"]');
async function choose(page: Page, row: Locator, hotels: string[]) {
  await row.getByRole("button", { name: /Seleccionar varios hoteles/ }).click();
  const dialog = page.getByRole("dialog");
  for (const checkbox of await dialog.getByRole("checkbox").all()) {
    const name = await checkbox.evaluate((e) =>
      e.parentElement!.textContent!.trim(),
    );
    if (!(await checkbox.isDisabled()))
      await checkbox.setChecked(hotels.includes(name));
  }
  await dialog.getByRole("button", { name: "Aplicar destinos" }).click();
}
async function number(row: Locator, label: string, value: string) {
  const input = row.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press("Enter");
}
test("several hotels create independent rows with a shared stock ceiling", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, original(page), ["Elba Carlota", "Elba Sara"]);
  await expect(group(page)).toHaveCount(2);
  const sara = group(page).filter({
    has: page
      .locator("select.inline-destination")
      .filter({ has: page.locator('option:checked[value="Elba Sara"]') }),
  });
  await number(original(page), "Inventario corregido", "60");
  await expect(
    sara.getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("60");
  await number(original(page), "Enviadas", "40");
  await number(sara, "Enviadas", "20");
  await expect(original(page)).toContainText("Disponibles: 0");
  await number(sara, "Enviadas", "21");
  await expect(page.getByRole("alert")).toContainText("suman 61");
  await expect(sara.getByLabel("Enviadas", { exact: true })).toHaveValue("20");
  await number(original(page), "Inventario corregido", "59");
  await expect(page.getByRole("alert")).toContainText(
    "inventario disponible de 59",
  );
  await expect(
    original(page).getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("60");
  await page.reload();
  await expect(group(page)).toHaveCount(2);
  await expect(
    group(page).getByLabel("Inventario corregido", { exact: true }).first(),
  ).toHaveValue("60");
  await expect(group(page).getByRole("img").first()).toHaveAttribute(
    "src",
    "/images/excel/sheraton_reduced_0.jpg",
  );
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  await page.getByLabel("Destino del PDF").selectOption("Elba Sara");
  await expect(page.getByRole("dialog")).toContainText(
    "16 registros de Elba Sara",
  );
});
test("destinations with movements stay protected and receipts share the stock limit", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, original(page), ["Elba Carlota", "Elba Sara"]);
  await number(original(page), "Enviadas", "40");
  await expect(
    original(page).getByLabel("Destino", { exact: true }),
  ).toBeDisabled();
  await original(page)
    .getByRole("button", { name: /Seleccionar varios hoteles/ })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("checkbox", { name: /Elba Carlota/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  const destinationRow = group(page).filter({
    has: page.locator("select.inline-destination").filter({
      has: page.locator('option:checked[value="Elba Sara"]'),
    }),
  });
  await number(destinationRow, "Enviadas", "11");
  await page.getByLabel("Hotel que registra").selectOption("Elba Carlota");
  await number(original(page), "Recibidas", "41");
  await expect(page.getByRole("alert")).toContainText("40 unidades enviadas");
  await expect(
    original(page).getByLabel("Recibidas", { exact: true }),
  ).toHaveValue("");
  await number(original(page), "Recibidas", "40");
  await page.getByLabel("Hotel que registra").selectOption("Elba Sara");
  const sara = group(page).filter({
    has: page
      .locator("select.inline-destination")
      .filter({ has: page.locator('option:checked[value="Elba Sara"]') }),
  });
  await number(sara, "Recibidas", "12");
  await expect(page.getByRole("alert")).toContainText("11 unidades enviadas");
  await expect(sara.getByLabel("Recibidas", { exact: true })).toHaveValue("");
  await number(sara, "Recibidas", "11");
  await expect(sara.locator("td").last()).toHaveText("Recibido");
});
test("removing unused destinations does not resurrect rows through Excel loading", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, original(page), [
    "Elba Carlota",
    "Elba Sara",
    "Elba Palace",
  ]);
  await expect(group(page)).toHaveCount(3);
  await choose(page, original(page), ["Elba Sara"]);
  await expect(group(page)).toHaveCount(1);
  await page.reload();
  await expect(group(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Cargar datos del Excel" }),
  ).toBeDisabled();
  await expect(group(page).getByLabel("Destino", { exact: true })).toHaveValue(
    "Elba Sara",
  );
});
test("selecting all distributions resets the product and removes generated rows", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, original(page), ["Elba Carlota", "Elba Sara"]);
  await number(original(page), "Inventario corregido", "60");
  for (const checkbox of await group(page).getByRole("checkbox").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Borrar datos seleccionados" })
    .click();
  await page.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(73);
  await expect(
    original(page).getByLabel("Destino", { exact: true }),
  ).toHaveValue("Elba Carlota");
  await expect(
    original(page).getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("");
});
test("existing repeated products share the original limit even when another hotel is filtered out", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.locator('tbody tr[data-record-id="excel-row-21"]'),
    second = page.locator('tbody tr[data-record-id="excel-row-22"]');
  await number(first, "Enviadas", "40");
  await number(second, "Enviadas", "20");
  await page.getByLabel("Filtrar ubicación").selectOption("Elba Lucía");
  await number(second, "Enviadas", "21");
  await expect(page.getByRole("alert")).toContainText("suman 61");
  await expect(second.getByLabel("Enviadas", { exact: true })).toHaveValue(
    "20",
  );
  await page.getByLabel("Filtrar ubicación").selectOption("");
  await expect(first.getByLabel("Enviadas", { exact: true })).toHaveValue("40");
});
test("partial reset keeps the shared correction and data of the other hotel", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, original(page), ["Elba Carlota", "Elba Sara"]);
  const sara = group(page).filter({
    has: page.locator('option:checked[value="Elba Sara"]'),
  });
  await number(original(page), "Inventario corregido", "60");
  await number(original(page), "Enviadas", "20");
  await number(sara, "Enviadas", "10");
  await original(page).getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Borrar datos seleccionados" })
    .click();
  await page.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(
    original(page).getByLabel("Enviadas", { exact: true }),
  ).toHaveValue("");
  await expect(sara.getByLabel("Enviadas", { exact: true })).toHaveValue("10");
  await expect(
    original(page).getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("60");
  await page.reload();
  await expect(group(page)).toHaveCount(2);
  await expect(
    original(page).getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("60");
});

test("corrected inventory can change either way and each receipt is capped by its shipment", async ({
  page,
}) => {
  await page.goto("/");
  await number(original(page), "Inventario corregido", "40");
  await expect(
    original(page).getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("40");
  await number(original(page), "Inventario corregido", "70");
  await number(original(page), "Enviadas", "35");
  await page.getByLabel("Hotel que registra").selectOption("Elba Carlota");
  await number(original(page), "Recibidas", "36");
  await expect(page.getByRole("alert")).toContainText("35 unidades enviadas");
  await expect(
    original(page).getByLabel("Recibidas", { exact: true }),
  ).toHaveValue("");
  await number(original(page), "Recibidas", "34");
  await number(original(page), "Recibidas", "35");
  await expect(
    original(page).getByLabel("Recibidas", { exact: true }),
  ).toHaveValue("35");
  await page.getByLabel("Hotel que registra").selectOption("Hotel Sheraton");
  await number(original(page), "Enviadas", "34");
  await expect(
    original(page).getByLabel("Enviadas", { exact: true }),
  ).toHaveValue("35");
  await page.reload();
  await expect(
    original(page).getByLabel("Recibidas", { exact: true }),
  ).toHaveValue("35");
});
