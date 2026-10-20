import { test, expect } from "@playwright/test";
test("search ignores accents case punctuation and spacing without changing displayed names", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByLabel("Buscar mobiliario");
  for (const query of ["SOFA", "sofá", "S.O.F.A.", " s ó f a ", "SO,FA"]) {
    await search.fill(query);
    await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(2);
    await expect(page.getByText("Sofá", { exact: true })).toBeVisible();
  }
  for (const query of ["ELBALUCIA", "Elba, Lucía.", "  elba   lucia "]) {
    await search.fill(query);
    await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(15);
  }
  await page.evaluate(() =>
    localStorage.setItem(
      "sheraton-inventory-v1",
      JSON.stringify([
        {
          id: "punctuation",
          name: "Sofá, salón. Ático",
          origin: "SHERATON",
          location: "Elba Sara",
          category: "Asientos",
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
  for (const query of [
    "SOFA SALON ATICO",
    "Sofá-Salón,Ático.",
    "sofa.salon.atico",
  ]) {
    await search.fill(query);
    await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(1);
    await expect(
      page.getByText("Sofá, salón. Ático", { exact: true }),
    ).toBeVisible();
  }
  await search.fill("Mesa");
  await expect(page.locator("tbody tr[data-record-id]")).toHaveCount(0);
});
