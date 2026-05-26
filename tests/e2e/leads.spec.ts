import { test, expect } from "@playwright/test";

// Full leads flow requires the Tauri sidecar + mocked Anthropic responses.
// In the Vite-preview default config we test the ParamView render path.
test.describe("leads ParamView", () => {
  test("renders all 7 input groups when a key is set", async ({ page }) => {
    await page.addInitScript(() => {
      const state = {
        state: {
          apiKey: "sk-ant-PLACEHOLDER",
          locale: "en",
          theme: "system",
          monthlyBudgetUsd: 20,
        },
        version: 0,
      };
      localStorage.setItem("transport-paca-settings", JSON.stringify(state));
    });
    await page.goto("/skills/leads");
    await expect(page.getByText("Carrier lead finder")).toBeVisible();
    await expect(page.getByText("Truck types")).toBeVisible();
    await expect(page.getByText("Fleet size")).toBeVisible();
    await expect(page.getByText("Number of leads")).toBeVisible();
    await expect(page.getByText("Provinces & territories")).toBeVisible();
    await expect(page.getByText("Cities")).toBeVisible();
    await expect(page.getByText("Preferred lanes")).toBeVisible();
  });
});
