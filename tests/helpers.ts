import { type Locator, type Page } from "@playwright/test";
export const row = (page: Page, id = "excel-row-2") =>
  page.locator(`tr[data-record-id="${id}"]`);
export const group = (row: Locator) => row.locator("xpath=ancestor::tbody");
export const destinationRow = (page: Page, hotel: string) =>
  page
    .locator("tr[data-record-id]")
    .filter({
      has: page
        .locator('td[data-label="Destino"]')
        .getByText(hotel, { exact: true }),
    });
export async function number(target: Locator, label: string, value: string) {
  const input = (
    label === "Total real disponible" ? group(target) : target
  ).getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press("Enter");
}
export async function distribute(
  target: Locator,
  values: Record<string, string | null>,
) {
  await group(target)
    .getByRole("button", { name: "Repartir entre hoteles", exact: true })
    .click();
  const page = target.page();
  const dialog = page.getByRole("dialog");
  for (const checkbox of await dialog.getByRole("checkbox").all()) {
    const hotel = await checkbox.evaluate(
      (e) => e.parentElement!.childNodes[1]?.textContent?.trim() ?? "",
    );
    if (!(await checkbox.isDisabled()))
      await checkbox.setChecked(hotel in values);
  }
  for (const [hotel, n] of Object.entries(values))
    await dialog
      .getByLabel(`Unidades para ${hotel}`, { exact: true })
      .fill(n ?? "");
  await dialog
    .getByRole("button", { name: "Guardar reparto", exact: true })
    .click();
}
