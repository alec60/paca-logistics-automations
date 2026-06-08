// Robustly recover a JSON object from an LLM reply. Anthropic responses with
// web_search interleave narration text blocks ("I need to search …") that the
// caller concatenates ahead of the final answer, so we can't assume the whole
// string is JSON. These helpers locate the object inside surrounding prose and
// fail with a clean ModelOutputError instead of a raw `Unexpected token …`.
import { ModelOutputError } from "./types";

/** Every top-level brace-balanced `{...}` slice in `text`, ignoring braces
 *  that live inside JSON strings (so a `{` in a quoted value never throws off
 *  the depth count). */
export function balancedObjects(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return out;
}

/** Pull the result JSON out of a model reply. Tolerates ```json fences,
 *  leading/trailing prose, and narration emitted during web_search. Throws
 *  ModelOutputError (clean, retryable) when no JSON object can be recovered. */
export function extractJson(raw: string): unknown {
  const text = raw.trim();
  const candidates: string[] = [];
  // 1. A fenced ```json block, if the model added one.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());
  // 2. Embedded objects, largest first — the real payload dwarfs any stray
  //    `{}` in the narration, so the biggest parseable slice wins.
  candidates.push(...balancedObjects(text).sort((a, b) => b.length - a.length));
  // 3. Last resort: the whole thing (covers a clean, prose-free reply).
  candidates.push(text);
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try the next candidate */
    }
  }
  throw new ModelOutputError("No JSON object found in model response.", raw);
}
