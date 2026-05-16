import { expect, test } from "@playwright/test";

test("solenoid visualization renders step controls and the stage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Launch" }).nth(2).click();

  await expect(page.getByRole("heading", { name: "Solenoid Field Lab" })).toBeVisible();
  await expect(page.getByText("Legend")).toBeVisible();
  await expect(page.getByText("Red arrows")).toBeVisible();
  await expect(page.getByText("Cyan arrows")).toBeVisible();
  await expect(page.getByText("Right-hand rule")).toBeVisible();
  await expect(page.getByRole("button", { name: "1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3" })).toBeVisible();
  await expect(page.getByRole("button", { name: "4" })).toBeVisible();
  await expect(page.locator("div[style*='height: 72vh']")).toBeVisible();

  await page.getByRole("button", { name: "4" }).click();
  await expect(page.getByRole("heading", { name: "On-axis field profile" })).toBeVisible();
  await expect(page.getByText("Bz on axis (T)")).toBeVisible();
  await expect(page.getByText("μ0 n I guide")).toBeVisible();
  await expect(page.getByText("Symbols")).toBeVisible();
});
