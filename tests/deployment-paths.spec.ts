import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import inventory from "../src/data/inventory.json" with { type: "json" };

for (const mount of ["/", "/Inventario-mobiliario-Sheraton/"]) {
  test(`production assets, all photos and PDF work at ${mount}`, async ({
    page,
  }) => {
    const root = resolve("dist");
    const missing: string[] = [];
    let photoFileRequests = 0;
    await page.route("http://inventory.test/**", async (route) => {
      const pathname = decodeURIComponent(
        new URL(route.request().url()).pathname,
      );
      // Reproduce a deployment where the JPEG files cannot be served.
      if (/\/images\/excel\/.*\.jpg$/.test(pathname)) {
        photoFileRequests += 1;
        await route.fulfill({ status: 404 });
        return;
      }
      if (!pathname.startsWith(mount)) {
        missing.push(pathname);
        await route.fulfill({ status: 404 });
        return;
      }
      const relative = pathname.slice(mount.length) || "index.html";
      const file = resolve(root, relative);
      if (!file.startsWith(root + "/")) {
        await route.fulfill({ status: 403 });
        return;
      }
      try {
        const body = await readFile(file);
        const mime: Record<string, string> = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".jpg": "image/jpeg",
          ".png": "image/png",
          ".woff2": "font/woff2",
          ".woff": "font/woff",
        };
        await route.fulfill({
          status: 200,
          body,
          contentType: mime[extname(file)] ?? "application/octet-stream",
        });
      } catch {
        missing.push(pathname);
        await route.fulfill({ status: 404 });
      }
    });
    const storedRows = structuredClone(inventory).map((row) => ({ ...row }));
    Object.assign(storedRows[0], {
      correctedQuantity: 51,
      allocatedQuantity: 31,
      sent: 7,
      notes: "Conservar mi reparto",
    });
    const saved = JSON.stringify([
      ...storedRows,
      {
        ...storedRows[0],
        id: "saved-hotel-split",
        inventoryGroup: "excel-row-2",
        distributionOf: undefined,
        allocatedQuantity: 20,
        sent: null,
        location: "Elba Sara",
        image:
          "http://inventory.test/old-path/images/excel/sheraton_reduced_0.jpg",
      },
    ]);
    await page.addInitScript(
      (data) => localStorage.setItem("sheraton-inventory-v1", data),
      saved,
    );
    await page.goto(`http://inventory.test${mount}?v=path-test`);
    await expect(page.locator("tr[data-record-id]")).toHaveCount(74);
    const pictures = await page.locator("img").evaluateAll(async (images) => {
      images.forEach((image) => (image.loading = "eager"));
      await Promise.all(images.map((image) => image.decode()));
      return images.map((image) => ({
        src: image.currentSrc,
        width: image.naturalWidth,
      }));
    });
    expect(pictures.length).toBeGreaterThan(60);
    expect(
      pictures.every(
        (image) =>
          image.width > 0 &&
          (image.src.startsWith("data:image/jpeg;base64,") ||
            image.src.startsWith(`http://inventory.test${mount}`)),
      ),
    ).toBeTruthy();
    await page
      .getByRole("button", { name: "Exportar PDF", exact: true })
      .click();
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Descargar PDF", exact: true })
      .click();
    const download = await downloading;
    const bytes = await readFile((await download.path())!);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(missing).toEqual([]);
    expect(photoFileRequests).toBe(0);
    expect(
      await page.evaluate(() => localStorage.getItem("sheraton-inventory-v1")),
    ).toBe(saved);
    await expect(
      page
        .locator('tr[data-record-id="excel-row-2"]')
        .getByLabel("Enviadas", { exact: true }),
    ).toHaveValue("7");
  });
}
