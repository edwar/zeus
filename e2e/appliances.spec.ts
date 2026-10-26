import { expect, test } from "@playwright/test";

// Estimar el consumo con electrodomésticos en lugar de la factura: el total alimenta el paso «Datos».
test("el consumo se calcula con electrodomésticos, cantidad y clase, y pasa al paso Datos", async ({ page }) => {
  await page.goto("/es/simulator");
  await page.getByRole("button", { name: "Prefiero estimar con mis electrodomésticos" }).click();
  await expect(page.getByRole("heading", { name: "Estima tu consumo con tus electrodomésticos" })).toBeVisible();

  const total = page.locator(".appl__total strong");
  await expect(total).toContainText("45 kWh/mes"); // una nevera clase D
  await page.getByRole("combobox", { name: "Clase" }).click();
  await page.getByRole("option", { name: "A", exact: true }).click();
  await expect(total).toContainText("22,5 kWh/mes");

  await page.getByRole("button", { name: "Agregar electrodoméstico" }).click();
  await page.getByRole("spinbutton", { name: "Cantidad" }).nth(1).fill("0");
  await expect(page.getByText("Revisa la cantidad")).toBeVisible();
  await expect(page.getByRole("button", { name: "Usar este consumo" })).toBeDisabled();
  await page.getByRole("spinbutton", { name: "Cantidad" }).nth(1).fill("2");
  await page.getByRole("spinbutton", { name: "kWh/mes de la etiqueta" }).nth(1).fill("18.67");
  await expect(total).toContainText("59,8 kWh/mes"); // 22,5 + 2 × 18,67

  await page.getByRole("button", { name: "Usar este consumo" }).click();
  await expect(page.getByRole("heading", { name: "Datos" }).first()).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: /Consumo mensual/ })).toHaveValue("59.8");
  await expect(page.getByText("Estimado con tus electrodomésticos")).toBeVisible();

  await page.getByRole("button", { name: "Volver" }).click(); // vuelve a los electrodomésticos, con lo escrito
  await expect(total).toContainText("59,8 kWh/mes");
});
