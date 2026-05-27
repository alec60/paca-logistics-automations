// POST /api/claude/messages
//   body: { apiKey: string, request: Anthropic.MessageCreateParams }
//   returns: Anthropic.Message + parsed usage breakdown
//
// POST /api/claude/:slug (alias kept for v0 frontend; same payload)
//
// The sidecar is a thin proxy: it never persists state, never parses skill
// results, never touches the DB. The frontend owns all of that.
import { Router } from "express";
import type { Request, Response } from "express";
import { makeClient, ANTHROPIC_MODEL } from "../lib/anthropic";

export const claudeRouter = Router();

interface MessagesPayload {
  apiKey: string;
  request: unknown; // Anthropic.MessageCreateParams — typed at the SDK boundary
}

async function handleMessages(req: Request, res: Response) {
  const { apiKey, request } = req.body as MessagesPayload;
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ error: "missing apiKey" });
  }
  if (!request || typeof request !== "object") {
    return res.status(400).json({ error: "missing request" });
  }
  try {
    const client = makeClient(apiKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await client.messages.create(request as any);
    res.json({
      message,
      usage: message.usage,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? "Anthropic error" });
  }
}

claudeRouter.post("/messages", handleMessages);

// POST /api/claude/test — verifies the API key with a 1-token ping.
// Returns { ok: true } on success, or { ok: false, status, error, kind } on
// failure with a Claude.ai-vs-Console hint when the key shape is suspicious.
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
      keyPrefix: trimmed.slice(0, 12),
      keyLength: trimmed.length,
      startsRight,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    const status = e.status ?? 500;
    let hint: string | undefined;
    if (status === 401) {
      hint = startsRight
        ? "Key was rejected. Verify it's an active API key at console.anthropic.com → Settings → API Keys, that it hasn't been revoked, and that your account has credit on https://console.anthropic.com/settings/billing."
        : "This key does not start with 'sk-ant-'. Anthropic API keys come from console.anthropic.com, NOT claude.ai. Claude.ai Pro/Max does not include API access.";
    }
    return res.status(200).json({
      ok: false,
      status,
      error: e.message ?? "Anthropic error",
      keyPrefix: trimmed.slice(0, 12),
      keyLength: trimmed.length,
      startsRight,
      hint,
    });
  }
});

// Backward-compat alias used by the frontend skill router.
claudeRouter.post("/:slug", handleMessages);
