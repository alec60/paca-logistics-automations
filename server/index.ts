// Tauri sidecar — local Express proxy for Anthropic SDK calls.
// Phase 2 wires this up; Phase 1 ships a typed stub.
import express from "express";

export function createServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  // Routes registered in Phase 2.
  return app;
}

if (process.env.TP_SIDECAR_START === "1") {
  const app = createServer();
  const port = Number(process.env.TP_SIDECAR_PORT ?? 0);
  app.listen(port, "127.0.0.1", () => {
    // eslint-disable-next-line no-console
    console.log(`[sidecar] listening on 127.0.0.1:${port}`);
  });
}
