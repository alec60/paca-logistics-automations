import type { LeadsParams, LeadsResult, Carrier } from "./schemas";
import { LeadsResult as LeadsResultSchema } from "./schemas";
import { buildMessagesRequest } from "./prompt";
import { callSidecar } from "../../core/claude-client";
import { blacklistApi, budgetApi } from "../../core/context";
import { getDb } from "../../core/db";
import { BudgetError } from "../../core/types";
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

function extractJson(raw: string): unknown {
  // Tolerate ```json fences if the model ignored the no-fences instruction.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  return JSON.parse(body.trim());
}

export async function handle(
  params: LeadsParams,
  opts: { apiKey: string; locale: "en" | "fr" },
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

  // 2. Call sidecar → Anthropic with web_search.
  const request = buildMessagesRequest(params, opts.locale);
  const response = await callSidecar<ProxyResponse>("/api/claude/messages", {
    method: "POST",
    body: { apiKey: opts.apiKey, request },
  });

  // 3. Parse the JSON the model returned.
  const text = extractText(response.message);
  const parsed = LeadsResultSchema.parse(extractJson(text));

  // 4. Filter out blacklisted carriers.
  const allowed = (await blacklistApi.filterCarriers(parsed.carriers)) as Carrier[];
  const blacklistedCount = parsed.carriers.length - allowed.length;

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
    leadsReturned: allowed.length,
  });

  const finalResult: LeadsResult = {
    ...parsed,
    carriers: allowed,
    cost_estimate_usd: realCost,
    blacklisted_count: blacklistedCount,
  };

  // 6. Persist to search_history.
  try {
    const db = await getDb();
    await db.execute(
      "INSERT INTO search_history (skill_slug, params_json, result_json, cost_usd) VALUES ($1, $2, $3, $4)",
      ["leads", JSON.stringify(params), JSON.stringify(finalResult), realCost],
    );
  } catch {
    // history is best-effort
  }

  return finalResult;
}
