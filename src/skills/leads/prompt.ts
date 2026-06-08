// Builds the Anthropic Messages payload for a leads search.
import type { LeadsParams } from "./schemas";
import { ANTHROPIC_MODEL, WEB_SEARCH_TOOL } from "../../../server/lib/anthropic";

const SYSTEM = `You are a senior logistics analyst at a Canadian freight brokerage.
Your job: given the user's filters, identify real Canadian trucking carriers that match.

RULES
- Only use information you can verify via the web_search tool. Never invent contact data.
- CONTACT — PREFER, DON'T REQUIRE: prioritize carriers with a public phone or email (search the carrier website, contact/about page, and public directories) and LIST THOSE FIRST. Aim to return the FULL requested count — if you cannot find that many WITH verified contact info, FILL THE REMAINDER with relevant matching carriers even without contact rather than returning fewer. Never return fewer than three-quarters of the requested count when matching carriers exist.
- HARD CAP on fleet size: never return a carrier whose fleet exceeds the maximum number of trucks stated in the user message. This is a strict ceiling, not a preference.
- Prefer carriers with public websites, MC/DOT numbers, or government-registered fleets.
- Paraphrase carrier descriptions; do not copy marketing prose verbatim.
- If a regional sector is supplied (e.g. QC-N), treat it as a soft preference, not a reject filter.
- Return as close to the requested count as possible; only return fewer than that if there genuinely are not enough matching carriers in Canada.
- For any optional field you cannot verify, OMIT THE KEY ENTIRELY (do not use null, "", or "N/A").
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
    `Find ${params.count} Canadian trucking carriers matching these filters — return as close to ${params.count} as you can:`,
    `- Truck types: ${params.truck_types.join(", ")}`,
    `- Maximum fleet size: ${params.max_fleet_size} trucks (HARD CAP — never exceed this).`,
    params.provinces.length ? `- Provinces: ${params.provinces.join(", ")}` : "",
    params.sectors.length ? `- Regional sectors (soft): ${params.sectors.join(", ")}` : "",
    params.cities.length ? `- Cities of interest: ${params.cities.join(", ")}` : "",
    params.lanes.length ? `- Preferred lanes: ${params.lanes.join(", ")}` : "",
    params.custom_instructions
      ? `\nAdditional instructions from the user (apply within the rules above): ${params.custom_instructions}`
      : "",
    "",
    locale(l),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    model: ANTHROPIC_MODEL,
    // Conservative for Tier 1 (8k OTPM cap). Plenty for ~10 carriers as JSON.
    max_tokens: 2048,
    system: SYSTEM,
    tools: [WEB_SEARCH_TOOL],
    messages: [{ role: "user" as const, content: userPrompt }],
  };
}
