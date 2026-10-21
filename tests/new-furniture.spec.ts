import { test, expect } from "@playwright/test";

test("new furniture offers all hotels for origin and destination without category", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Añadir mobiliario" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Sección / categoría", { exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel("Ubicación", { exact: true })).toHaveCount(0);
  const origin = dialog.getByRole("combobox", {
    name: "Hotel origen",
    exact: true,
  });
  const destination = dialog.getByRole("combobox", {
    name: "Hotel destino",
    exact: true,
  });
  const expected = [
    "Hotel Sheraton",
    "Elba Carlota",
    "Elba Sara",
    "Elba Lucía",
    "Elba Palace",
    "Elba San Jorge",
    "Elba Vecindario",
  ];
  await expect(origin.locator("option")).toHaveText(expected);
  await expect(destination.locator("option")).toHaveText([
    "Selecciona hotel destino",
    ...expected,
  ]);
  await expect(origin).toHaveValue("Hotel Sheraton");
  await dialog
    .getByLabel("Nombre", { exact: true })
    .fill("Mesa auxiliar alta nueva");
  await origin.selectOption("Elba Sara");
  await destination.selectOption("Hotel Sheraton");
  await dialog.getByLabel("Unidades", { exact: true }).fill("3");
  await dialog
    .getByRole("button", { name: "Guardar mobiliario", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  const row = page
    .locator("tr[data-record-id]")
    .filter({
      has: page.getByText("Mesa auxiliar alta nueva", { exact: true }),
    });
  await expect(row.locator('td[data-label="Origen"]')).toHaveText("Elba Sara");
  await expect(row.locator('td[data-label="Destino"] strong')).toHaveText(
    "Hotel Sheraton",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sheraton-inventory-v1")!).find(
      (i: { name: string }) => i.name === "Mesa auxiliar alta nueva",
    ),
  );
  expect(saved).toMatchObject({
    origin: "Elba Sara",
    location: "Hotel Sheraton",
    quantity: 3,
    category: "Otros",
  });
  await page
    .getByRole("button", { name: "Repartir entre hoteles", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("checkbox", { name: "Hotel Sheraton", exact: true }),
  ).toBeVisible();
});
