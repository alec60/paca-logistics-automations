import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

// Base path: served at "/" for Tauri dev / Tauri build, and under the GitHub
// Pages repo path when GITHUB_PAGES=1. Repo name is hardcoded here so a stray
// run of `pnpm build` without the env still emits a working bundle for the
// repo's Pages URL.
const REPO_NAME = "paca-logistics-automations";
const base = process.env.GITHUB_PAGES === "1" ? `/${REPO_NAME}/` : "/";

export default defineConfig(async () => ({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // .nojekyll lives next to index.html so a stray "Deploy from a branch"
      // mode would still serve our assets — defense in depth, not a fix for
      // the source-mode bug.
      includeAssets: ["logo.svg", ".nojekyll"],
      manifest: {
        name: "Transport Paca",
        short_name: "Paca",
        description: "Carrier intelligence for Transport Paca.",
        theme_color: "#161a26",
        background_color: "#161a26",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // The Anthropic API and (in Tauri dev) the sidecar must always go to
        // the network; cache only the static shell + assets.
        navigateFallbackDenylist: [/^\/api\//, /^\/healthz/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://rsms.me",
            handler: "CacheFirst",
            options: { cacheName: "rsms-fonts" },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // Vite options tailored for Tauri development.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
