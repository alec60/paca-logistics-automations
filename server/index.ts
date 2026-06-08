// Tauri sidecar — local Express proxy for Anthropic SDK calls.
// The browser uses /api/auth/register exactly once after unlock; from then on
// the sidecar holds the API key in process memory and the renderer carries a
// short-lived session token via X-Session-Token.
import express from "express";
import { claudeRouter } from "./routes/claude";
import { authRouter } from "./routes/auth";

// Origin allowlist. The webview's origin under Tauri is `tauri://localhost`
// and `http://tauri.localhost`; the Vite dev server runs at 1420 and 5173 as
// fallbacks. Anything else is rejected pre-flight.
const ALLOWED_ORIGINS = new Set([
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export function createServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // CORS — explicit allowlist instead of "*". A request without an Origin
  // header (e.g. curl, server-to-server) reaches the route handler but won't
  // get a permissive ACAO echoed back; combined with the X-Session-Token
  // requirement on /api/claude/* that's enough.
  app.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,X-Session-Token",
    );
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/claude", claudeRouter);

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // Log only the message — never the full error object, which can carry
      // request context (the /api/auth/register + /api/claude/test bodies
      // include the plaintext API key).
      console.error("[sidecar]", err.message);
      res.status(500).json({ error: err.message || "Internal error" });
    },
  );

  return app;
}

if (process.env.TP_SIDECAR_START === "1") {
  const app = createServer();
  const port = Number(process.env.TP_SIDECAR_PORT ?? 19191);
  app.listen(port, "127.0.0.1", () => {
    console.log(`[sidecar] listening on 127.0.0.1:${port}`);
  });
}
