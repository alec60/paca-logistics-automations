// Sidecar-side session management.
//
// Old model (security debt from earlier): the frontend sent the apiKey in
// every request body. Per audit P0.2 / P1.6, that's wrong — any compromised
// origin reaching 127.0.0.1:19191 with a key payload would be served.
//
// New model: after the lock-screen unlock decrypts the apiKey, the renderer
// hands it to /api/auth/register exactly once. The sidecar stores the key in
// process memory and returns a short-lived random session token. Every later
// request to /api/claude/* carries that token via X-Session-Token. The key
// itself never traverses the loopback again.
import { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour after last use

interface Session {
  apiKey: string;
  token: string;
  createdAt: number;
  lastUsedAt: number;
}

// Module-private. Only one active session at a time — single-user desktop app.
let session: Session | null = null;

export function getSession(token: string | undefined): Session | null {
  if (!session || !token) return null;
  if (token !== session.token) return null;
  const now = Date.now();
  if (now - session.lastUsedAt > SESSION_TTL_MS) {
    session = null;
    return null;
  }
  session.lastUsedAt = now;
  return session;
}

export function clearSession() {
  session = null;
}

export const authRouter = Router();

authRouter.post("/register", (req: Request, res: Response) => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ error: "missing apiKey" });
  }
  const token = randomBytes(32).toString("base64url");
  session = {
    apiKey: apiKey.trim(),
    token,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };
  return res.json({
    sessionToken: token,
    expiresInMs: SESSION_TTL_MS,
  });
});

authRouter.post("/logout", (req: Request, res: Response) => {
  const token = req.header("x-session-token");
  if (token && session?.token === token) {
    session = null;
  }
  res.json({ ok: true });
});

authRouter.get("/me", (req: Request, res: Response) => {
  const token = req.header("x-session-token");
  const s = getSession(token);
  res.json({
    ok: !!s,
    expiresInMs: s ? SESSION_TTL_MS - (Date.now() - s.lastUsedAt) : 0,
  });
});

// Middleware factory: any route mounted under requireSession() rejects without
// a valid X-Session-Token header.
export function requireSession() {
  return (req: Request, res: Response, next: () => void) => {
    const token = req.header("x-session-token");
    const s = getSession(token);
    if (!s) {
      return res.status(401).json({ error: "no session — call /api/auth/register first" });
    }
    // Stash the apiKey on the request for downstream handlers.
    (req as Request & { sessionApiKey: string }).sessionApiKey = s.apiKey;
    next();
  };
}
