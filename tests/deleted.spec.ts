import { test, expect } from "@playwright/test";
const row = (page: import("@playwright/test").Page, id = "excel-row-2") =>
  page.locator(`tbody tr[data-record-id="${id}"]`);
async function remove(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Borrar mobiliario", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "puede afectar al inventario",
  );
  await page.getByRole("button", { name: "Sí, eliminar mobiliario" }).click();
}
test("delete cancels safely, persists removed rows and recovers all saved data", async ({
  page,
}) => {
  await page.goto("/");
  const corrected = row(page).getByLabel("Inventario corregido", {
    exact: true,
  });
  await corrected.fill("60");
  await corrected.press("Enter");
  const sent = row(page).getByLabel("Enviadas", { exact: true });
  await sent.fill("35");
  await sent.press("Enter");
  await row(page).getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Borrar mobiliario", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "No", exact: true })
    .click();
  await expect(row(page)).toHaveCount(1);
  await remove(page);
  await expect(row(page)).toHaveCount(0);
  await page.reload();
  await expect(row(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cargar datos del Excel" }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Recuperar mobiliario eliminado (1)",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Sí, recuperar todos" }).click();
  await expect(row(page)).toHaveCount(1);
  await expect(corrected).toHaveValue("60");
  await expect(sent).toHaveValue("35");
  await expect(row(page).getByRole("img")).toHaveAttribute(
    "src",
    /sheraton_reduced_0.jpg/,
  );
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Recuperar mobiliario eliminado (0)",
      exact: true,
    }),
  ).toBeDisabled();
  await row(page).getByRole("checkbox").check();
  await remove(page);
  await expect(
    page.getByRole("button", {
      name: "Recuperar mobiliario eliminado (1)",
      exact: true,
    }),
  ).toBeEnabled();
});
test("deleting one repeated Excel row does not return through reset and recover respects stock", async ({
  page,
}) => {
  await page.goto("/");
  for (const [id, amount] of [
    ["excel-row-21", "40"],
    ["excel-row-22", "20"],
  ]) {
    const input = row(page, id).getByLabel("Enviadas", { exact: true });
    await input.fill(amount);
    await input.press("Enter");
  }
  await row(page, "excel-row-22").getByRole("checkbox").check();
  await remove(page);
  const sent = row(page, "excel-row-21").getByLabel("Enviadas", {
    exact: true,
  });
  await sent.fill("50");
  await sent.press("Enter");
  await page
    .getByRole("button", {
      name: "Recuperar mobiliario eliminado (1)",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Sí, recuperar todos" }).click();
  await expect(page.getByRole("dialog")).toContainText("superan el inventario");
  await expect(row(page, "excel-row-22")).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "No", exact: true })
    .click();
  await row(page, "excel-row-21").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Borrar datos seleccionados", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sí", exact: true })
    .click();
  await expect(row(page, "excel-row-22")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Recuperar mobiliario eliminado (1)",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Sí, recuperar todos" }).click();
  await expect(
    row(page, "excel-row-22").getByLabel("Enviadas", { exact: true }),
  ).toHaveValue("20");
});
test("failed recovery-copy write never removes furniture", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith("-deleted"))
        throw new DOMException("Quota", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await row(page).getByRole("checkbox").check();
  await remove(page);
  await expect(page.getByRole("dialog")).toContainText(
    "No se ha eliminado ningún mobiliario",
  );
  await expect(row(page)).toHaveCount(1);
});
