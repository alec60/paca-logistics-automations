// Tauri sidecar — local Express proxy for Anthropic SDK calls.
// The browser sends a skill request; the sidecar holds the apiKey transit-only
// and forwards to Anthropic. Frontend handles validation, blacklist, budget
// because it owns the SQLite DB (tauri-plugin-sql).
import express from "express";
import { claudeRouter } from "./routes/claude";
import { settingsRouter } from "./routes/settings";
import { blacklistRouter } from "./routes/blacklist";
import { budgetRouter } from "./routes/budget";

export function createServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // CORS — Tauri webview talks to 127.0.0.1; allow only the Tauri dev host.
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.use("/api/claude", claudeRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/blacklist", blacklistRouter);
  app.use("/api/budget", budgetRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error("[sidecar]", err);
    res.status(500).json({ error: err.message || "Internal error" });
  });

  return app;
}

if (process.env.TP_SIDECAR_START === "1") {
  const app = createServer();
  const port = Number(process.env.TP_SIDECAR_PORT ?? 19191);
  app.listen(port, "127.0.0.1", () => {
    // eslint-disable-next-line no-console
    console.log(`[sidecar] listening on 127.0.0.1:${port}`);
  });
}
