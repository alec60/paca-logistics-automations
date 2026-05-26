import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
  },
  // For full Tauri e2e wire `tauri-driver`. Default config runs against the
  // Vite preview so the UI layer is testable without the desktop bundle.
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev:vite",
        url: "http://localhost:1420",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
