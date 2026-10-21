import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

for (const mount of ["/", "/Inventario-mobiliario-Sheraton/"]) {
  test(`production assets, all photos and PDF work at ${mount}`, async ({
    page,
  }) => {
    const root = resolve("dist");
    const missing: string[] = [];
    await page.route("http://inventory.test/**", async (route) => {
      const pathname = decodeURIComponent(
        new URL(route.request().url()).pathname,
      );
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
    await page.goto(`http://inventory.test${mount}?v=path-test`);
    await expect(page.locator("tr[data-record-id]")).toHaveCount(73);
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
          image.src.startsWith(`http://inventory.test${mount}`),
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
  });
}
