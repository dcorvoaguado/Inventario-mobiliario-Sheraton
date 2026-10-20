import { test, expect } from "@playwright/test";
import { row, group, number, distribute } from "./helpers";
test("sender and receiver workflow preserves immutable identity, original counts and attribution", async ({
  page,
}) => {
  await page.goto("/");
  await number(row(page), "Total real disponible", "52");
  await distribute(row(page), { "Elba Sara": "50" });
  const target = row(page);
  await expect(group(target)).toContainText("Inventario original: 51");
  await number(target, "Enviadas", "50");
  await target
    .getByLabel("Rotura envío", { exact: true })
    .selectOption("damaged");
  await number(target, "Unidades rotas en envío", "2");
  await expect(target.getByLabel("Recibidas", { exact: true })).toBeDisabled();
  await page
    .getByLabel("Hotel que registra", { exact: true })
    .selectOption("Elba Sara");
  await expect(target.getByLabel("Enviadas", { exact: true })).toBeDisabled();
  await expect(
    group(target).getByLabel("Total real disponible", { exact: true }),
  ).toBeDisabled();
  await number(target, "Recibidas", "48");
  await target
    .getByLabel("Rotura recepción", { exact: true })
    .selectOption("damaged");
  await number(target, "Unidades rotas en recepción", "1");
  await page.reload();
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sheraton-inventory-v1")!).find(
      (i: { id: string }) => i.id === "excel-row-2",
    ),
  );
  expect(record).toMatchObject({
    quantity: 51,
    correctedQuantity: 52,
    allocatedQuantity: 50,
    sent: 50,
    received: 48,
    damageSent: 2,
    damageReceived: 1,
    sentBy: "Hotel Sheraton",
    receivedBy: "Elba Sara",
    name: "Sillón tapizado",
    origin: "SHERATON",
  });
});
test("numbers validate locally, zero is recorded and blank remains pending", async ({
  page,
}) => {
  await page.goto("/");
  const target = row(page);
  await number(target, "Enviadas", "-1");
  await expect(target.getByRole("alert")).toContainText("Solo enteros");
  await number(target, "Enviadas", "1.5");
  await expect(target.getByRole("alert")).toContainText("Solo enteros");
  await number(target, "Enviadas", "0");
  await expect(target).toContainText("Enviado");
  await expect(target).toContainText("Guardado ✓");
  await number(target, "Enviadas", "");
  await expect(target.locator("td").last()).toHaveText("Pendiente");
});
