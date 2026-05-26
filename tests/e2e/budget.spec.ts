import { test, expect } from "@playwright/test";

test.describe("budget meter", () => {
  test("renders with default $20 limit when DB is unreachable", async ({ page }) => {
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
    await page.goto("/");
    await expect(page.getByText(/\$0\.00 \/ \$20/)).toBeVisible();
  });

  test.skip("80% warning toast and 100% block (requires Tauri SQLite)", () => {
    // Implement once tauri-driver is wired.
  });
});
