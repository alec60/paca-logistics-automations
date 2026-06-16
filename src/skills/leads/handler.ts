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

interface ContentBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
}
interface ProxyResponse {
  message: {
    content: ContentBlock[];
    stop_reason?: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      server_tool_use?: { web_search_requests?: number };
    };
  };
}

function extractText(message: ProxyResponse["message"]): string {
  return message.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}

/** The structured result from the submit_leads tool call, if the model used it
 *  (the happy path — schema-validated, no scraping). */
function extractSubmittedLeads(message: ProxyResponse["message"]): unknown {
  for (const b of message.content) {
    if (b.type === "tool_use" && b.name === "submit_leads") return b.input;
  }
  return undefined;
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
// public phone/email — sort to the top.
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

const MAX_ATTEMPTS = 2;

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

  const fleetCap = clampFleetCap(params.max_fleet_size);
  const request = buildMessagesRequest({ ...params, max_fleet_size: fleetCap }, opts.locale);

  // 2 + 3. Call sidecar → Anthropic (web_search + submit_leads tool), then read
  // the structured result. Prefer the tool call; fall back to JSON-in-text;
  // retry once before surfacing a clean, retryable error. Usage accumulates
  // across attempts so the logged cost is honest.
  let parsed: LeadsResult | null = null;
  let lastRaw = "";
  let inTok = 0;
  let outTok = 0;
  let webCalls = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !parsed; attempt++) {
    let response: ProxyResponse;
    try {
      response = await callSidecar<ProxyResponse>("/api/claude/messages", {
        method: "POST",
        body: { request },
      });
    } catch (err) {
      if (err instanceof SidecarError && err.status === 429) {
        throw new RateLimitError(
          opts.locale === "fr"
            ? "Limite de débit Anthropic atteinte. Réessayez dans ~60 s, ou réduisez le nombre de pistes."
            : "Anthropic rate limit hit. Retry in ~60s, or lower the lead count.",
          60,
        );
      }
      throw err;
    }

    inTok += response.message.usage.input_tokens || 0;
    outTok += response.message.usage.output_tokens || 0;
    webCalls += response.message.usage.server_tool_use?.web_search_requests ?? 0;

    const structured = extractSubmittedLeads(response.message);
    lastRaw =
      structured !== undefined ? JSON.stringify(structured) : extractText(response.message);
    try {
      // structured tool output is the happy path; otherwise recover JSON from
      // the prose (extractTextJson throws if there's none — caught below).
      const candidate =
        structured !== undefined ? structured : extractTextJson(response.message);
      parsed = LeadsResultSchema.parse(candidate) as LeadsResult;
    } catch (err) {
      const truncated = response.message.stop_reason === "max_tokens";
      console.warn(
        `[leads] parse attempt ${attempt}/${MAX_ATTEMPTS} failed` +
          (truncated ? " (response hit max_tokens)" : "") +
          ":",
        err,
      );
      if (attempt >= MAX_ATTEMPTS) {
        console.warn("[leads] giving up. raw output:\n", lastRaw);
        throw new ModelOutputError(
          opts.locale === "fr"
            ? "Le modèle n'a pas renvoyé de résultats exploitables. Réessayez — c'est généralement passager."
            : "The model didn't return usable results. Please try again — this is usually transient.",
          lastRaw,
        );
      }
    }
  }

  // Unreachable in practice (the loop throws on final failure), but keeps the
  // type checker happy and is a defensive backstop.
  if (!parsed) {
    throw new ModelOutputError(
      opts.locale === "fr" ? "Réponse du modèle illisible." : "Unreadable model response.",
      lastRaw,
    );
  }

  // 4. Filter: blacklist → redundant fleet hard cap → rank by richness.
  const allowed = (await blacklistApi.filterCarriers(parsed.carriers)) as Carrier[];
  const blacklistedCount = parsed.carriers.length - allowed.length;
  const withinCap = allowed.filter((c) => !fleetExceedsCap(c.fleet_size, fleetCap));
  const finalCarriers = [...withinCap].sort((a, b) => carrierRichness(b) - carrierRichness(a));

  // 5. Cost from accumulated usage.
  const realCost = computeCostUsd({
    inputTokens: inTok,
    outputTokens: outTok,
    webSearchCalls: webCalls,
  });
  await budgetApi.logSpend(realCost, "leads", {
    params,
    webSearchCalls: webCalls,
    leadsReturned: finalCarriers.length,
  });

  const finalResult: LeadsResult = {
    ...parsed,
    carriers: finalCarriers,
    cost_estimate_usd: realCost,
    blacklisted_count: blacklistedCount,
  };

  // 6. Persist to search_history (SQLite + Zustand mirror).
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
    useSettingsStore.getState().pushHistoryMirror({ id: Date.now(), ...historyEntry });
  } catch {
    // best-effort
  }

  return finalResult;
}

/** Fallback for when the model answered in text instead of calling the tool:
 *  recover the JSON object from the prose. */
function extractTextJson(message: ProxyResponse["message"]): unknown {
  return extractJson(extractText(message));
}
