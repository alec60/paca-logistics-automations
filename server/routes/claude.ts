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
import { makeClient } from "../lib/anthropic";

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
// Backward-compat alias used by the frontend skill router.
claudeRouter.post("/:slug", handleMessages);
