import { test, expect } from "@playwright/test";

test("landing page renders brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AI Doctor in a Box/i })).toBeVisible();
  await expect(page.getByText(/not a substitute/i).first()).toBeVisible();
});

test("dashboard search bar exists", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByLabel(/search diseases/i)).toBeVisible();
});
