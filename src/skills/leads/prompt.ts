// Builds the Anthropic Messages payload for a leads search.
import type { LeadsParams } from "./schemas";
import { ANTHROPIC_MODEL, WEB_SEARCH_TOOL } from "../../../server/lib/anthropic";

const SYSTEM = `You are a senior logistics analyst at a Canadian freight brokerage.
Your job: given the user's filters, identify real Canadian trucking carriers that match.

RULES
- Only use information you can verify via the web_search tool. Never invent contact data.
- Prefer carriers with public websites, MC/DOT numbers, or government-registered fleets.
- Paraphrase carrier descriptions; do not copy marketing prose verbatim.
- If a regional sector is supplied (e.g. QC-N), treat it as a soft preference, not a reject filter.
- If you cannot reach the requested count after several searches, return what you have honestly.
- Return ONLY a single JSON object matching the schema in the user message — no prose, no markdown fences.

JSON SCHEMA
{
  "query_summary": string,
  "carriers": [{
    "company": string,
    "province": string,         // 2-letter code
    "city": string?,
    "fleet_size": string?,      // e.g. "Small (1-10)" or "~25 trucks"
    "equipment": string[],
    "phone": string?,
    "email": string?,
    "website": string?,
    "lanes": string?            // free-form description of typical lanes
  }],
  "sources": [{ "title": string, "url": string }]
}`;

function locale(l: "en" | "fr"): string {
  return l === "fr"
    ? "Respond with the JSON object only. Field VALUES may stay in English from carrier websites."
    : "Respond with the JSON object only.";
}

export function buildMessagesRequest(params: LeadsParams, l: "en" | "fr") {
  const userPrompt = [
    `Find ${params.count} Canadian trucking carriers matching these filters:`,
    `- Truck types: ${params.truck_types.join(", ")}`,
    `- Fleet size: ${params.fleet_size}`,
    params.provinces.length ? `- Provinces: ${params.provinces.join(", ")}` : "",
    params.sectors.length ? `- Regional sectors (soft): ${params.sectors.join(", ")}` : "",
    params.cities.length ? `- Cities of interest: ${params.cities.join(", ")}` : "",
    params.lanes.length ? `- Preferred lanes: ${params.lanes.join(", ")}` : "",
    "",
    locale(l),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [WEB_SEARCH_TOOL],
    messages: [{ role: "user" as const, content: userPrompt }],
  };
}
