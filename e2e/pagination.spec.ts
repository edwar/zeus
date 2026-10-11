import { expect, test, type Locator, type Page } from "@playwright/test";
import { as } from "./support/session";

const nums = (dp: Locator) => dp.locator('[data-slot="pagination-link"]').evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? "").filter((t) => /^\d+$/.test(t)));
const summary = async (dp: Locator) => {
  const m = (await dp.locator(".dp__summary").innerText()).match(/(\d+) de (\d+)(?:.*?(\d+)\s)?/);
  return { page: Number(m![1]), pages: Number(m![2]) };
};
async function setRows(page: Page, dp: Locator, rows: number) {
  await dp.getByRole("combobox").click();
  await page.getByRole("option", { name: String(rows), exact: true }).click();
}

test.describe("paginador", () => {
  test("panel · filas por página, anterior/siguiente y tres páginas", async ({ browser }) => {
    const admin = await as(browser, "admin");
    await admin.goto("/es/app/products");
    const dp = admin.locator(".dp");
    await expect(dp).toBeVisible({ timeout: 60_000 });

    // Primera página: Anterior desactivado y las páginas 1, 2 y 3.
    expect(await nums(dp)).toEqual(["1", "2", "3"]);
    await expect(dp.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await expect(dp.locator('[aria-current="page"]')).toHaveText("1");

    // Menos filas por página: hay más páginas y se vuelve a la primera.
    const before = (await summary(dp)).pages;
    await setRows(admin, dp, 10);
    await expect(async () => expect((await summary(dp)).pages).toBeGreaterThan(before)).toPass();
    expect((await summary(dp)).page).toBe(1);
    await expect(admin.locator(".tbl tbody tr")).toHaveCount(10);

    // Siguiente: la ventana de tres páginas acompaña a la actual.
    await dp.getByRole("button", { name: "Siguiente" }).click();
    await expect(dp.locator('[aria-current="page"]')).toHaveText("2");
    expect(await nums(dp)).toEqual(["1", "2", "3"]);
    await dp.getByRole("button", { name: "Ir a la página 3" }).click();
    await expect(dp.locator('[aria-current="page"]')).toHaveText("3");
    expect(await nums(dp)).toEqual(["2", "3", "4"]);
    await dp.getByRole("button", { name: "Anterior" }).click();
    await expect(dp.locator('[aria-current="page"]')).toHaveText("2");
    await admin.close();
  });

  test("catálogo · los números son enlaces y las filas por página van en la URL", async ({ page }) => {
    await page.goto("/es/products");
    const dp = page.locator(".dp");
    await expect(dp).toBeVisible();
    expect(await nums(dp)).toEqual(["1", "2", "3"]);

    // Enlaces reales (rastreables), no botones.
    await expect(dp.getByRole("link", { name: "Ir a la página 2" })).toHaveAttribute("href", /page=2/);
    await dp.getByRole("link", { name: "Ir a la página 2" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(dp.locator('[aria-current="page"]')).toHaveText("2");

    // Cambiar las filas vuelve a la página 1 y queda en la URL.
    await setRows(page, dp, 24);
    await expect(page).toHaveURL(/size=24/);
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.locator(".pcard")).toHaveCount(24);
    await expect(dp.getByRole("link", { name: "Ir a la página 2" })).toHaveAttribute("href", /size=24.*page=2|page=2.*size=24/);
  });
});
