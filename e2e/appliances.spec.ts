import { expect, test } from "@playwright/test";

// Estimar el consumo con electrodomésticos en lugar de la factura: el total alimenta el paso «Datos».
test("el consumo se calcula marcando electrodomésticos, su cantidad y su clase, y pasa al paso Datos", async ({ page }) => {
  await page.goto("/es/simulator");
  await page.getByRole("button", { name: "Prefiero estimar con mis electrodomésticos" }).click();
  await expect(page.getByRole("heading", { name: "Estima tu consumo con tus electrodomésticos" })).toBeVisible();

  const total = page.locator(".appl__total strong");
  await expect(total).toContainText("0 kWh/mes");
  await expect(page.getByRole("button", { name: "Usar este consumo" })).toBeDisabled();

  const fridge = page.getByRole("button", { name: "Nevera", exact: true });
  await fridge.click();
  await expect(fridge).toHaveAttribute("aria-pressed", "true");
  await expect(total).toContainText("45 kWh/mes"); // una nevera clase D

  await page.getByRole("button", { name: "Más: Nevera" }).click();
  await expect(total).toContainText("90 kWh/mes");
  await page.getByRole("button", { name: "Menos: Nevera" }).click();
  await page.getByRole("combobox", { name: "Clase: Nevera" }).click();
  await page.getByRole("option", { name: "A", exact: true }).click();
  await expect(total).toContainText("22,5 kWh/mes");

  await page.getByRole("button", { name: "Televisor", exact: true }).click();
  await page.getByRole("button", { name: "Más: Televisor" }).click(); // 2 televisores
  await page.getByText("Tengo el consumo de la etiqueta").click();
  await page.getByRole("spinbutton", { name: "Televisor" }).fill("18.67");
  await expect(total).toContainText("59,8 kWh/mes"); // 22,5 + 2 × 18,67

  await page.getByRole("button", { name: "Menos: Televisor" }).click();
  await page.getByRole("button", { name: "Menos: Televisor" }).click(); // con 1 unidad, «menos» lo desmarca
  await expect(page.getByRole("button", { name: "Televisor", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(total).toContainText("22,5 kWh/mes");
  await page.getByRole("button", { name: "Televisor", exact: true }).click();
  await page.getByRole("button", { name: "Más: Televisor" }).click();
  await page.getByRole("spinbutton", { name: "Televisor" }).fill("18.67");

  await page.getByRole("button", { name: "Usar este consumo" }).click();
  await expect(page.getByRole("spinbutton", { name: /Consumo mensual/ })).toHaveValue("59.8");
  await expect(page.getByText("Estimado con tus electrodomésticos")).toBeVisible();

  await page.getByRole("button", { name: "Volver" }).click(); // vuelve a los electrodomésticos, con lo marcado
  await expect(total).toContainText("59,8 kWh/mes");
  await expect(page.getByRole("button", { name: "Nevera", exact: true })).toHaveAttribute("aria-pressed", "true");
});
