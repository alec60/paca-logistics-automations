import type { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { useSettingsStore } from "./core/settings-store";

// First-run gate: if no API key is set, force the user to /settings.
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
            <div className="p-8 text-text-muted">Sélectionnez une automatisation dans la barre latérale.</div>
          </RequireApiKey>
        ),
      },
      // Skill routes are registered dynamically in Phase 2 via skill-registry.
      // Placeholder route to be replaced by registry-driven routes:
      { path: "skills/:slug", element: <RequireApiKey><div /></RequireApiKey> },
      { path: "history", element: <RequireApiKey><div /></RequireApiKey> },
      { path: "settings", element: <div /> },
    ],
  },
]);
