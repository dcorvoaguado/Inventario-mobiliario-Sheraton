import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import inventory from "../src/data/inventory.json" with { type: "json" };
test("loads every record, applies repeated quantities and shows the matching photograph", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(73);
  const row = page.locator('tbody tr[data-record-id="excel-row-22"]');
  await expect(row.locator("xpath=ancestor::tbody")).toContainText(
    "Inventario original: 60",
  );
  await page
    .getByRole("button", {
      name: "Ver foto de Sillón tapizado",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText("fila");
  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute(
    "src",
    "/images/excel/sheraton_reduced_0.jpg",
  );
  await page.getByRole("button", { name: "Cerrar fotografía" }).click();
  await page.getByLabel("Filtrar ubicación").selectOption("__missing");
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(13);
  for (const image of new Set(inventory.map((i) => i.image).filter(Boolean))) {
    const r = await request.get("/" + image);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/jpeg");
    expect((await r.body()).subarray(0, 2)).toEqual(Buffer.from([255, 216]));
  }
});
test("edits transfer quantities without replacing unknowns with zero", async ({
  page,
}) => {
  await page.goto("/");
  const row = page.locator('tbody tr[data-record-id="excel-row-22"]');
  await expect(
    row
      .locator("xpath=ancestor::tbody")
      .getByLabel("Total real disponible", { exact: true }),
  ).toHaveValue("60");
  await expect(row).not.toContainText("=I21");
  await row.getByLabel("Enviadas", { exact: true }).fill("0");
  await row.getByLabel("Enviadas", { exact: true }).press("Enter");
  await page.reload();
  await expect(row.locator("xpath=ancestor::tbody")).toContainText(
    "Inventario original: 60",
  );
  await expect(row.getByLabel("Enviadas", { exact: true })).toHaveValue("0");
  await expect(row.getByLabel("Recibidas", { exact: true })).toHaveValue("");
  const d = page.waitForEvent("download");
  await page.getByText("Más opciones", { exact: true }).click();
  await page
    .getByRole("button", { name: "Descargar copia de seguridad" })
    .click();
  const download = await d;
  const path = await download.path();
  const data = JSON.parse(await readFile(path!, "utf8"));
  const item = data.find((i: { id: string }) => i.id === "excel-row-22");
  expect(item.quantity).toBe(60);
  expect(item.sent).toBe(0);
  expect(item.received).toBeNull();
  expect(item.source.formulas.F).toBe("=I21");
});
test("gallery works on mobile and source loading preserves existing user records", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Galería de fotos" }).click();
  await expect(page.locator(".gallery article")).toHaveCount(69);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() =>
    localStorage.setItem(
      "sheraton-inventory-v1",
      JSON.stringify([
        {
          id: "local-user",
          name: "Mueble local",
          origin: "Hotel",
          location: "Almacén",
          category: "Otros",
          quantity: 1,
          sent: null,
          received: null,
          recycled: null,
          condition: "Sin evaluar",
          notes: "",
        },
      ]),
    ),
  );
  await page.reload();
  await page.getByText("Más opciones", { exact: true }).click();
  await page.getByRole("button", { name: "Cargar datos del Excel" }).click();
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(74);
  await expect(page.getByText("Mueble local", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cargar datos del Excel" }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(74);
});
