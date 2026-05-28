import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./core/i18n";
import "./index.css";

// GitHub Pages SPA shim: 404.html bounces unknown paths to /?p=<original-path>.
// Restore that into the URL bar before React Router boots so deep links work.
(function restoreSpaPath() {
  const p = new URLSearchParams(window.location.search).get("p");
  if (!p) return;
  const target = decodeURIComponent(p);
  window.history.replaceState(null, "", target || "/");
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
