import { test, expect } from "@playwright/test";
const row2 = (page: import("@playwright/test").Page) =>
  page.locator("tbody tr").filter({
    has: page.getByRole("button", {
      name: "Ver foto de Sillón tapizado",
      exact: true,
    }),
  });
test("inline workflow locks identity, keeps original counts and attributes each hotel", async ({
  page,
}) => {
  await page.goto("/");
  const row = row2(page);
  await expect(row.getByRole("textbox")).toHaveCount(0);
  await expect(
    row
      .getByLabel("Destino", { exact: true })
      .locator("option:not([disabled])"),
  ).toHaveText([
    "Sin destino asignado",
    "Elba Carlota",
    "Elba Sara",
    "Elba Lucía",
    "Elba Palace",
  ]);
  await expect(row.getByLabel("Recibidas", { exact: true })).toBeDisabled();
  await row.getByLabel("Inventario corregido", { exact: true }).fill("52");
  await row.getByLabel("Inventario corregido", { exact: true }).press("Enter");
  await expect(row.locator("td").nth(3)).toContainText("51");
  await row.getByLabel("Destino", { exact: true }).selectOption("Elba Sara");
  await row.getByLabel("Enviadas", { exact: true }).fill("50");
  await row.getByLabel("Enviadas", { exact: true }).press("Enter");
  await expect(row).toContainText("Comprobado por Hotel Sheraton");
  await expect(row.locator("td").last()).toHaveText("Enviado");
  await row.getByLabel("Rotura envío", { exact: true }).selectOption("damaged");
  await row.getByLabel("Unidades rotas en envío", { exact: true }).fill("2");
  await row
    .getByLabel("Unidades rotas en envío", { exact: true })
    .press("Enter");
  await page.getByLabel("Hotel que registra").selectOption("Elba Carlota");
  await expect(row.getByLabel("Recibidas", { exact: true })).toBeDisabled();
  await page.getByLabel("Hotel que registra").selectOption("Elba Sara");
  await expect(row.getByLabel("Enviadas", { exact: true })).toBeDisabled();
  await expect(
    row.getByLabel("Inventario corregido", { exact: true }),
  ).toBeDisabled();
  await row.getByLabel("Recibidas", { exact: true }).fill("48");
  await row.getByLabel("Recibidas", { exact: true }).press("Enter");
  await expect(row).toContainText("Comprobado por Elba Sara");
  await expect(row.locator("td").last()).toHaveText("Recibido");
  await row
    .getByLabel("Rotura recepción", { exact: true })
    .selectOption("damaged");
  await row
    .getByLabel("Unidades rotas en recepción", { exact: true })
    .fill("1");
  await row
    .getByLabel("Unidades rotas en recepción", { exact: true })
    .press("Enter");
  await page.reload();
  await expect(
    row.getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("52");
  await expect(row.locator("td").nth(3)).toContainText("51");
  await expect(row.getByLabel("Destino", { exact: true })).toBeDisabled();
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sheraton-inventory-v1")!).find(
      (i: { id: string }) => i.id === "excel-row-2",
    ),
  );
  expect(record).toMatchObject({
    quantity: 51,
    correctedQuantity: 52,
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
test("zero is recorded, blank is pending and invalid counts do not save", async ({
  page,
}) => {
  await page.goto("/");
  const row = row2(page);
  const sent = row.getByLabel("Enviadas", { exact: true });
  await sent.fill("-1");
  await sent.press("Enter");
  await expect(sent).toHaveAttribute("aria-invalid", "true");
  await expect(row.locator("td").last()).toHaveText("Pendiente");
  await sent.fill("1.5");
  await sent.press("Enter");
  await expect(sent).toHaveAttribute("aria-invalid", "true");
  await sent.fill("0");
  await sent.press("Enter");
  await expect(row.locator("td").last()).toHaveText("Enviado");
  await page.getByLabel("Hotel que registra").selectOption("Elba Carlota");
  const received = row.getByLabel("Recibidas", { exact: true });
  await received.fill("0");
  await received.press("Enter");
  await expect(row.locator("td").last()).toHaveText("Recibido");
  await received.fill("");
  await received.press("Enter");
  await expect(row.locator("td").last()).toHaveText("Enviado");
  await page.getByLabel("Hotel que registra").selectOption("Hotel Sheraton");
  await sent.fill("");
  await sent.press("Enter");
  await expect(row.locator("td").last()).toHaveText("Pendiente");
});
test("migrates earlier corrections and keeps original photo name and origin", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const seed = {
      id: "excel-row-2",
      name: "Cambio antiguo",
      origin: "Otro",
      location: "Elba Carlota",
      category: "Distribución inicial",
      quantity: 99,
      sent: 8,
      received: null,
      recycled: 3,
      condition: "Sin evaluar",
      notes: "Nota conservada",
      image: null,
    };
    localStorage.setItem("sheraton-inventory-v1", JSON.stringify([seed]));
  });
  await page.reload();
  const row = row2(page);
  await expect(row).toContainText("Sillón tapizado");
  await expect(row).toContainText("SHERATON");
  await expect(row.locator("td").nth(3)).toHaveText("51");
  await expect(
    row.getByLabel("Inventario corregido", { exact: true }),
  ).toHaveValue("99");
  await expect(row).toContainText("Rotura anterior sin responsable: 3");
});
