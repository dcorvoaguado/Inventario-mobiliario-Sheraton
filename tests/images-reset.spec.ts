import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import inventory from "../src/data/inventory.json" with { type: "json" };
async function seeded(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate((rows) => {
    const first = rows.find((i) => i.id === "excel-row-2")!;
    Object.assign(first, {
      location: "Elba Sara",
      correctedQuantity: 52,
      sent: 50,
      received: 48,
      damageSent: 2,
      damageSentMode: "damaged",
      damageReceived: 1,
      damageReceivedMode: "damaged",
      notes: "Comentario añadido",
    });
    Object.assign(
      rows.find((i) => i.id === "excel-row-3")!,
      { sent: 7 },
    );
    rows.push({
      ...first,
      id: "new-local",
      name: "Mueble nuevo",
      source: undefined,
      quantity: 3,
    });
    localStorage.setItem("sheraton-inventory-v1", JSON.stringify(rows));
  }, structuredClone(inventory));
  await page.reload();
}
test("uploads a device photo, preserves it on reload and exports it to PDF", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Añadir mobiliario" }).click();
  await page
    .getByLabel("Subir foto del mobiliario")
    .setInputFiles("public/images/excel/sheraton_reduced_0.jpg");
  await expect(
    page.getByRole("img", { name: "Vista previa del nuevo mobiliario" }),
  ).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  await page.getByLabel("Nombre", { exact: true }).fill("Nuevo con foto");
  await page
    .getByRole("combobox", { name: "Hotel destino", exact: true })
    .selectOption("Elba Sara");
  await page.getByRole("button", { name: "Guardar mobiliario" }).click();
  await page.reload();
  const row = page
    .locator("tbody tr[data-record-id]")
    .filter({ has: page.getByText("Nuevo con foto", { exact: true }) });
  await expect(row.getByRole("img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  expect(
    await row
      .getByRole("img")
      .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
  ).toBe(true);
  await expect(row.locator("input[type=file]")).toHaveCount(0);
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  await page.getByLabel("Destino del PDF").selectOption("Elba Sara");
  const d = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar PDF", exact: true })
    .click();
  await (await d).saveAs(testInfo.outputPath("con-foto.pdf"));
});
test("invalid images show an error and an existing inventory photo can be reused", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Añadir mobiliario" }).click();
  await page.getByLabel("Subir foto del mobiliario").setInputFiles({
    name: "falsa.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "No se puede abrir",
  );
  await page.getByRole("button", { name: "Usar foto del inventario" }).click();
  await page
    .getByRole("button", {
      name: "Seleccionar imagen de Sillón tapizado",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("img", { name: "Vista previa del nuevo mobiliario" }),
  ).toHaveAttribute(
    "src",
    "data:image/jpeg;base64," +
      (await readFile("public/images/excel/sheraton_reduced_0.jpg")).toString(
        "base64",
      ),
  );
  await page.getByRole("button", { name: "Quitar foto" }).click();
  await expect(
    page.getByRole("img", { name: "Vista previa del nuevo mobiliario" }),
  ).toHaveCount(0);
});
test("confirmation cancels safely and resetting selected records preserves unselected data", async ({
  page,
}) => {
  await seeded(page);
  await page
    .getByRole("checkbox", { name: /^Seleccionar Sillón tapizado ·/ })
    .check();
  await page
    .getByRole("checkbox", { name: /^Seleccionar Mueble nuevo ·/ })
    .check();
  await page.getByRole("button", { name: "Restablecer datos" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "2 registros seleccionados",
  );
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(74);
  const first = page.locator('[data-record-id="excel-row-2"]');
  await expect(first.getByLabel("Enviadas", { exact: true })).toHaveValue("50");
  await page.getByRole("button", { name: "Restablecer datos" }).click();
  await page.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(73);
  await expect(first.locator('td[data-label="Destino"] strong')).toHaveText(
    "Elba Carlota",
  );
  await expect(
    first.getByLabel("Total real disponible", { exact: true }),
  ).toHaveValue("51");
  await expect(first.getByLabel("Enviadas", { exact: true })).toHaveValue("");
  await expect(
    first.locator("xpath=ancestor::tbody").getByRole("img"),
  ).toHaveAttribute(
    "src",
    "data:image/jpeg;base64," +
      (await readFile("public/images/excel/sheraton_reduced_0.jpg")).toString(
        "base64",
      ),
  );
  await expect(
    page
      .locator('[data-record-id="excel-row-3"]')
      .getByLabel("Enviadas", { exact: true }),
  ).toHaveValue("7");
  await page.reload();
  await expect(page.locator('[data-record-id="new-local"]')).toHaveCount(0);
});
test("select all covers hidden records and reset restores the full original inventory", async ({
  page,
}) => {
  await seeded(page);
  await page.getByLabel("Filtrar ubicación").selectOption("Elba Carlota");
  await page
    .getByRole("checkbox", {
      name: "Seleccionar todo el mobiliario",
      exact: true,
    })
    .check();
  await expect(page.getByText(/74 de 74 seleccionados/)).toBeVisible();
  await page.getByRole("button", { name: "Restablecer datos" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "74 registros seleccionados",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Restablecer datos" }).click();
  await page.getByRole("button", { name: "Sí", exact: true }).click();
  await page.getByLabel("Filtrar ubicación").selectOption("");
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(73);
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sheraton-inventory-v1")!),
  );
  expect(
    data.every(
      (i: { sent: number | null; received: number | null }) =>
        i.sent === null && i.received === null,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("checkbox", {
      name: "Seleccionar todo el mobiliario",
      exact: true,
    }),
  ).not.toBeChecked();
});
