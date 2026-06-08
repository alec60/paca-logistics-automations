// Builds the Anthropic Messages payload for a shipper-prospect search.
import type { ShippersParams } from "./schemas";
import { VOLUME_LEVELS } from "./data";
import { ANTHROPIC_MODEL, WEB_SEARCH_TOOL } from "../../../server/lib/anthropic";

const SYSTEM = `You are a senior business-development analyst at a Canadian freight brokerage.
Your job: given the user's filters, identify real Canadian BUSINESSES THAT SHIP FREIGHT — manufacturers, distributors, producers, wholesalers — that would be strong prospects to sign as brokerage customers (companies that need trucks to move their goods).

RULES
- Only use information you can verify via the web_search tool. Never invent contact details or buying signals.
- TARGET SHIPPERS, NOT CARRIERS. Return companies that HAVE freight to move. EXCLUDE trucking carriers, freight brokers, 3PLs, couriers, and logistics/warehousing-for-hire companies — those are competitors or suppliers, not customers.
- CONTACT — PREFER, DON'T REQUIRE: prioritize companies with a public phone or email (a logistics/procurement/operations contact is best) and LIST THOSE FIRST. Aim to return the FULL requested count — if you cannot find that many WITH verified contact info, FILL THE REMAINDER with relevant matching companies even without contact rather than returning fewer. Never return fewer than three-quarters of the requested count when matching companies exist.
- BUYING SIGNAL: fill "why_prospect" with a concrete, verifiable reason this company likely needs freight capacity now — e.g. new or expanding facility, hiring supply-chain/logistics staff, recent funding or acquisition, new product line, seasonal volume, or a posted RFP/tender. If you cannot find a real signal, give a short factual note instead of inventing one.
- FREIGHT PROFILE: in "freight_profile", describe what they ship and the equipment it typically needs (e.g. "palletized dry goods — dry van", "temperature-controlled food — reefer", "steel coils — flatbed"). Align to the requested equipment types when provided.
- Treat regional sectors (e.g. QC-N), cities, and lanes as soft preferences, not hard reject filters.
- Paraphrase company descriptions; do not copy marketing prose verbatim.
- For any optional field you cannot verify, OMIT THE KEY ENTIRELY (do not use null, "", or "N/A").
- Return ONLY a single JSON object matching the schema in the user message — no prose, no markdown fences.

JSON SCHEMA
{
  "query_summary": string,
  "shippers": [{
    "company": string,
    "industry": string?,
    "province": string,          // 2-letter code
    "city": string?,
    "est_volume": string?,       // e.g. "Regular FTL" or "~5 loads/week"
    "freight_profile": string?,  // what they ship + equipment it needs
    "why_prospect": string?,     // concrete buying signal
    "lanes": string?,            // typical shipping lanes, free-form
    "contact_name": string?,     // logistics/procurement contact if public
    "phone": string?,
    "email": string?,
    "website": string?
  }],
  "sources": [{ "title": string, "url": string }]
}`;

function localeLine(l: "en" | "fr"): string {
  return l === "fr"
    ? "Respond with the JSON object only. Field VALUES may stay in English from company websites."
    : "Respond with the JSON object only.";
}

function volumeText(v: ShippersParams["volume"], l: "en" | "fr"): string {
  const lvl = VOLUME_LEVELS.find((x) => x.value === v);
  if (!lvl || v === "any") return "";
  return `- Target shipping volume: ${l === "fr" ? lvl.labelFr : lvl.labelEn}`;
}

export function buildMessagesRequest(params: ShippersParams, l: "en" | "fr") {
  const userPrompt = [
    `Find ${params.count} Canadian businesses (shippers) that match these filters and would be good freight-brokerage customers — return as close to ${params.count} as you can:`,
    `- Industries: ${params.industries.join(", ")}`,
    params.freight_equipment.length
      ? `- Freight needs / equipment: ${params.freight_equipment.join(", ")}`
      : "",
    volumeText(params.volume, l),
    params.provinces.length ? `- Provinces: ${params.provinces.join(", ")}` : "",
    params.sectors.length ? `- Regional sectors (soft): ${params.sectors.join(", ")}` : "",
    params.cities.length ? `- Cities of interest: ${params.cities.join(", ")}` : "",
    params.lanes.length ? `- Typical lanes (soft): ${params.lanes.join(", ")}` : "",
    params.custom_instructions
      ? `\nAdditional instructions from the user (apply within the rules above): ${params.custom_instructions}`
      : "",
    "",
    localeLine(l),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    model: ANTHROPIC_MODEL,
    // Conservative for Tier 1 (8k OTPM cap). Plenty for ~10 prospects as JSON.
    max_tokens: 2048,
    system: SYSTEM,
    tools: [WEB_SEARCH_TOOL],
    messages: [{ role: "user" as const, content: userPrompt }],
  };
}
