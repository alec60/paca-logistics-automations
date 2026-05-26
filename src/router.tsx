import type { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { useSettingsStore } from "./core/settings-store";
import { SettingsPage } from "./pages/Settings";
import { HistoryPage } from "./pages/History";
import { SkillRunner } from "./pages/SkillRunner";

// First-run gate: if no API key is set, redirect to /settings.
function RequireApiKey({ children }: { children: ReactNode }) {
  const apiKey = useSettingsStore((s) => s.apiKey);
  if (!apiKey) return <Navigate to="/settings" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
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
]);
