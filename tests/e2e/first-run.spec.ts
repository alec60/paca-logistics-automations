import { test, expect } from "@playwright/test";

// First-run gate: with no API key in localStorage, the app should redirect to
// /settings and surface the API key input.
test.describe("first run", () => {
  test("redirects to /settings when no API key is set", async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByLabel(/api key/i)).toBeVisible();
  });

  test("language switcher toggles UI strings", async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/settings");
    // French is default — sidebar shows French headers.
    await expect(page.getByText("Automatisations")).toBeVisible();
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByText("Automations")).toBeVisible();
  });
});
