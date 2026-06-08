import type { LeadsParams, LeadsResult, Carrier } from "./schemas";
import { LeadsResult as LeadsResultSchema } from "./schemas";
import { FLEET_CAP } from "./data";
import { buildMessagesRequest } from "./prompt";
import { callSidecar, SidecarError } from "../../core/claude-client";
import { extractJson } from "../../core/extract-json";
import { blacklistApi, budgetApi } from "../../core/context";
import { getDb } from "../../core/db";
import { useSettingsStore } from "../../core/settings-store";
import { BudgetError, ModelOutputError, RateLimitError } from "../../core/types";
import { computeCostUsd, estimateLeadSearchCost } from "../../../server/lib/cost";

interface ProxyResponse {
  message: {
    content: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; name: string }
      | { type: "server_tool_use"; name: string }
      | { type: "web_search_tool_result" }
      | Record<string, unknown>
    >;
    usage: {
      input_tokens: number;
      output_tokens: number;
      server_tool_use?: { web_search_requests?: number };
    };
  };
}

function extractText(message: ProxyResponse["message"]): string {
  return message.content
    .filter((b): b is { type: "text"; text: string } => "type" in b && b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/** Redundant hard cap: drop carriers whose reported fleet clearly exceeds the
 *  cap. fleet_size is free-form ("~25 trucks", "51-200"); take the largest
 *  number found. Unknown/unparseable sizes are kept (can't disprove). */
function fleetExceedsCap(fleetStr: string | undefined, cap: number): boolean {
  if (!fleetStr) return false;
  const nums = (fleetStr.match(/\d+/g) ?? []).map(Number).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return false;
  return Math.max(...nums) > cap;
}

// Rank by info richness so the most complete entries — especially those with a
// public phone/email — sort to the top. No hard contact filter: every match is
// kept and ranking surfaces the best ones first.
function carrierRichness(c: Carrier): number {
  let s = 0;
  if (c.phone?.trim()) s += 4;
  if (c.email?.trim()) s += 4;
  if (c.website) s += 2;
  if (c.city) s += 1;
  if (c.lanes) s += 1;
  if (c.fleet_size) s += 1;
  if (c.equipment.length > 0) s += 1;
  return s;
}

function clampFleetCap(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return FLEET_CAP.default;
  return Math.min(Math.max(Math.round(n), FLEET_CAP.min), FLEET_CAP.max);
}

export async function handle(
  params: LeadsParams,
  opts: { locale: "en" | "fr" },
): Promise<LeadsResult> {
  // 1. Pre-call budget gate.
  const estimate = estimateLeadSearchCost({
    leads: params.count,
    provinces: params.provinces.length,
    lanes: params.lanes.length,
  });
  const check = await budgetApi.canAffordEstimate(estimate);
  if (!check.ok) {
    throw new BudgetError(check.reason ?? "Budget exceeded");
  }

  // 2. Call sidecar → Anthropic with web_search. The session token (already
  // registered by the runtime-secrets layer) authenticates this call; the
  // apiKey itself is not in the body.
  const fleetCap = clampFleetCap(params.max_fleet_size);
  const request = buildMessagesRequest({ ...params, max_fleet_size: fleetCap }, opts.locale);
  let response: ProxyResponse;
  try {
    response = await callSidecar<ProxyResponse>("/api/claude/messages", {
      method: "POST",
      body: { request },
    });
  } catch (err) {
    // Map Anthropic 429s to a domain-specific error so the UI can render
    // a clean retry banner instead of the raw rate-limit JSON.
    if (err instanceof SidecarError && err.status === 429) {
      const retryAfter = 60;
      throw new RateLimitError(
        opts.locale === "fr"
          ? `Limite de débit Anthropic atteinte (Niveau 1 : 30 000 jetons d'entrée/min). Réessayez dans ~${retryAfter} s, ou réduisez le nombre de pistes demandées.`
          : `Anthropic rate limit hit (Tier 1: 30k input tokens/min). Retry in ~${retryAfter}s, or lower the lead count.`,
        retryAfter,
      );
    }
    throw err;
  }

  // 3. Parse the JSON the model returned. With web_search the model sometimes
  // narrates ("I need to search …") around the JSON, so extraction is tolerant;
  // if it still can't recover a valid result, surface a clean, retryable
  // message (the raw text goes to the console for diagnosis) instead of letting
  // a raw SyntaxError/ZodError reach the user as "Unexpected token 'I' …".
  const text = extractText(response.message);
  let parsed: LeadsResult;
  try {
    parsed = LeadsResultSchema.parse(extractJson(text)) as LeadsResult;
  } catch (err) {
    console.warn("[leads] could not parse model output:", err, "\n--- raw ---\n", text);
    throw new ModelOutputError(
      opts.locale === "fr"
        ? "Le modèle n'a pas renvoyé de résultats exploitables (réponse incomplète ou interrompue). Réessayez — c'est généralement passager."
        : "The model didn't return usable results (incomplete or interrupted response). Please try again — this is usually transient.",
      text,
    );
  }

  // 4. Filter: blacklist → redundant fleet hard cap → require contact info.
  const allowed = (await blacklistApi.filterCarriers(parsed.carriers)) as Carrier[];
  const blacklistedCount = parsed.carriers.length - allowed.length;
  const withinCap = allowed.filter((c) => !fleetExceedsCap(c.fleet_size, fleetCap));
  // Keep every match (no contact requirement); rank so contact-bearing,
  // info-rich carriers lead and the model-returned count is preserved.
  const finalCarriers = [...withinCap].sort((a, b) => carrierRichness(b) - carrierRichness(a));

  // 5. Compute real cost from usage and log it.
  const webSearchCalls =
    response.message.usage.server_tool_use?.web_search_requests ?? 0;
  const realCost = computeCostUsd({
    inputTokens: response.message.usage.input_tokens,
    outputTokens: response.message.usage.output_tokens,
    webSearchCalls,
  });
  await budgetApi.logSpend(realCost, "leads", {
    params,
    webSearchCalls,
    leadsReturned: finalCarriers.length,
  });

  const finalResult: LeadsResult = {
    ...parsed,
    carriers: finalCarriers,
    cost_estimate_usd: realCost,
    blacklisted_count: blacklistedCount,
  };

  // 6. Persist to search_history (SQLite for durability + Zustand mirror for
  // browser-mode fallback / quick rendering).
  const historyEntry = {
    skill_slug: "leads",
    params_json: JSON.stringify(params),
    cost_usd: realCost,
    searched_at: new Date().toISOString(),
  };
  try {
    const db = await getDb();
    await db.execute(
      "INSERT INTO search_history (skill_slug, params_json, result_json, cost_usd) VALUES ($1, $2, $3, $4)",
      ["leads", historyEntry.params_json, JSON.stringify(finalResult), realCost],
    );
  } catch {
    // SQLite unavailable (e.g. browser preview). The Zustand mirror covers it.
  }
  try {
    useSettingsStore.getState().pushHistoryMirror({
      id: Date.now(),
      ...historyEntry,
    });
  } catch {
    // best-effort
  }

  return finalResult;
}
