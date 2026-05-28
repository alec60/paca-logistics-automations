import type { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { useRuntimeSecrets } from "./core/runtime-secrets";
import { SettingsPage } from "./pages/Settings";
import { HistoryPage } from "./pages/History";
import { SkillRunner } from "./pages/SkillRunner";

// First-run gate: if no API key is set, redirect to /settings.
// The lock screen has already gated entry to the whole app at this point,
// so the runtime apiKey reflects whatever was decrypted at unlock time.
function RequireApiKey({ children }: { children: ReactNode }) {
  const apiKey = useRuntimeSecrets((s) => s.apiKey);
  if (!apiKey) return <Navigate to="/settings" replace />;
  return <>{children}</>;
}

// Strip trailing slash so router compares cleanly against route paths.
// Vite populates BASE_URL from the `base` config: "/" for Tauri / dev, and
// "/paca-logistics-automations/" for the GitHub Pages build.
const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
      {
        index: true,
        element: (
          <RequireApiKey>
            <div className="p-8 text-text-muted">
              Sélectionnez une automatisation dans la barre latérale.
            </div>
          </RequireApiKey>
        ),
      },
      {
        path: "skills/:slug",
        element: (
          <RequireApiKey>
            <SkillRunner />
          </RequireApiKey>
        ),
      },
      {
        path: "history",
        element: (
          <RequireApiKey>
            <HistoryPage />
          </RequireApiKey>
        ),
      },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ],
  { basename: ROUTER_BASE },
);
