// Anthropic proxy routes.
// Requires a valid session token (set via /api/auth/register). The apiKey
// itself never travels in the body — the sidecar reads it from session
// state.
import { Router, type Request, type Response } from "express";
import { ANTHROPIC_MODEL, makeClient } from "../lib/anthropic";
import { requireSession } from "./auth";

export const claudeRouter = Router();

// Defensive caps applied to every Anthropic request the renderer asks for.
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20250929",
]);
const MAX_TOKENS_CAP = 4096;
const ALLOWED_TOOL_TYPES = new Set(["web_search_20250305"]);

interface MessagesBody {
  request: {
    model?: unknown;
    max_tokens?: unknown;
    tools?: Array<{ type?: unknown }>;
    [k: string]: unknown;
  };
}

function sanitizeRequest(raw: unknown): { ok: true; req: object } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "missing request" };
  const r = raw as MessagesBody["request"];
  if (typeof r.model !== "string" || !ALLOWED_MODELS.has(r.model)) {
    return { ok: false, error: `model not allowed (got ${String(r.model)})` };
  }
  if (typeof r.max_tokens !== "number" || r.max_tokens < 1 || r.max_tokens > MAX_TOKENS_CAP) {
    return { ok: false, error: `max_tokens must be 1..${MAX_TOKENS_CAP}` };
  }
  if (r.tools && Array.isArray(r.tools)) {
    for (const tool of r.tools) {
      if (!tool || typeof tool !== "object" || typeof tool.type !== "string") {
        return { ok: false, error: "tool entry malformed" };
      }
      if (!ALLOWED_TOOL_TYPES.has(tool.type)) {
        return { ok: false, error: `tool type not allowed: ${tool.type}` };
      }
    }
  }
  return { ok: true, req: r as object };
}

claudeRouter.post(
  "/messages",
  requireSession(),
  async (req: Request, res: Response) => {
    const apiKey = (req as Request & { sessionApiKey: string }).sessionApiKey;
    const body = req.body as MessagesBody;
    const check = sanitizeRequest(body?.request);
    if (!check.ok) return res.status(400).json({ error: check.error });
    try {
      const client = makeClient(apiKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = await client.messages.create(check.req as any);
      res.json({ message, usage: message.usage });
    } catch (err) {
      const e = err as { status?: number; message?: string };
      res.status(e.status ?? 500).json({ error: e.message ?? "Anthropic error" });
    }
  },
);

// POST /api/claude/test — verifies an API key with a 1-token ping.
// NOTE: does NOT use the session path because it's used by Settings BEFORE
// the user registers. Accepts the apiKey in the body, returns only shape
// hints (never the key prefix). Stays accessible via the localhost
// session-token middleware on /messages above.
claudeRouter.post("/test", async (req: Request, res: Response) => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ ok: false, error: "missing apiKey" });
  }
  const trimmed = apiKey.trim();
  const startsRight = trimmed.startsWith("sk-ant-");
  try {
    const client = makeClient(trimmed);
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return res.json({
      ok: true,
      model: message.model,
      keyLength: trimmed.length,
      startsRight,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    const status = e.status ?? 500;
    let hint: string | undefined;
    if (status === 401) {
      hint = startsRight
        ? "Key was rejected. Verify it's an active API key at console.anthropic.com → Settings → API Keys, that it hasn't been revoked, and that your account has credit at https://console.anthropic.com/settings/billing."
        : "This key does not start with 'sk-ant-'. Anthropic API keys come from console.anthropic.com, NOT claude.ai. Claude.ai Pro/Max does not include API access.";
    }
    return res.status(200).json({
      ok: false,
      status,
      error: e.message ?? "Anthropic error",
      keyLength: trimmed.length,
      startsRight,
      hint,
    });
  }
});
