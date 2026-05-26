import { test, expect } from "@playwright/test";

// Full add → re-search → confirm hidden → restore → confirm visible flow needs
// the Tauri SQLite layer. This file documents the contract and runs the
// settings-page render check that's testable without Tauri.
test.describe("blacklist manager", () => {
  test("renders the blacklist UI on the settings page", async ({ page }) => {
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
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /blacklist/i })).toBeVisible();
  });

  test.skip("add → re-search → confirm carrier hidden → restore (requires Tauri)", () => {
    // Implement once tauri-driver is wired. See AGENTS.md.
  });
});
