import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
test("editing fields fit desktop and narrow screens without horizontal scrolling", async ({
  page,
}) => {
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("tbody tr")).toHaveCount(73);
    const geometry = await page.evaluate(() => {
      const table = document.querySelector(".table-scroll")!;
      const first = document.querySelector("tbody tr")!;
      return {
        document: document.documentElement.scrollWidth <= innerWidth,
        table: table.scrollWidth <= table.clientWidth + 1,
        fields: [...first.querySelectorAll("input,select")].every((e) => {
          const b = e.getBoundingClientRect();
          return b.left >= 0 && b.right <= innerWidth && b.width >= 30;
        }),
      };
    });
    expect(geometry, `viewport ${width}`).toEqual({
      document: true,
      table: true,
      fields: true,
    });
  }
});
test("exports all destinations, a single hotel and separate PDFs in a ZIP", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Filtrar ubicación").selectOption("Elba Carlota");
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("73 registros");
  let waiting = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Descargar PDF", exact: true })
    .click();
  let download = await waiting;
  expect(download.suggestedFilename()).toBe("inventario-todos-los-hoteles.pdf");
  await download.saveAs(testInfo.outputPath("todos.pdf"));
  expect(
    (await readFile((await download.path())!)).subarray(0, 5).toString(),
  ).toBe("%PDF-");
  await expect(
    dialog.getByRole("button", { name: "Descargar PDF", exact: true }),
  ).toBeEnabled();
  await dialog.getByLabel("Destino del PDF").selectOption("Elba Sara");
  await expect(dialog).toContainText("15 registros de Elba Sara");
  waiting = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Descargar PDF", exact: true })
    .click();
  download = await waiting;
  expect(download.suggestedFilename()).toBe("inventario-elba-sara.pdf");
  await download.saveAs(testInfo.outputPath("elba-sara.pdf"));
  await expect(
    dialog.getByRole("button", { name: "Descargar PDF", exact: true }),
  ).toBeEnabled();
  await dialog.getByLabel("Destino del PDF").selectOption("__all");
  waiting = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "PDF por hotel (.zip)", exact: true })
    .click();
  download = await waiting;
  await download.saveAs(testInfo.outputPath("por-hotel.zip"));
  const files = unzipSync(
    new Uint8Array(await readFile((await download.path())!)),
  );
  expect(Object.keys(files)).toHaveLength(7);
  expect(Object.keys(files)).toContain("inventario-elba-sara.pdf");
  expect(Object.keys(files)).toContain("inventario-sin-destino-asignado.pdf");
  for (const bytes of Object.values(files))
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
});
