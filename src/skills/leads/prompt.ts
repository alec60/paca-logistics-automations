// Builds the Anthropic Messages payload for a leads search.
//
// The model researches with web_search, then returns results by calling the
// `submit_leads` tool — structured, schema-validated output instead of free-form
// JSON we have to scrape out of prose. That removes the whole class of
// "model narrated / truncated the JSON" parse failures.
import type { LeadsParams } from "./schemas";
import { parseCityKey } from "./data";
import { ANTHROPIC_MODEL, WEB_SEARCH_TOOL } from "../../../server/lib/anthropic";

// Selections are stored as "name|province" keys; show the model "Name (PROV)".
function formatCity(key: string): string {
  const { name, province } = parseCityKey(key);
  return province ? `${name} (${province})` : name;
}

// Structured-output tool. The model fills this; Anthropic validates it against
// the schema, and the handler reads `tool_use.input` directly.
export const SUBMIT_LEADS_TOOL = {
  name: "submit_leads",
  description:
    "Return the final list of matching Canadian trucking carriers. Call this exactly once, after researching with web_search. Put the entire answer here — do not also write it as prose.",
  input_schema: {
    type: "object",
    properties: {
      query_summary: {
        type: "string",
        description: "One short sentence summarising what was searched and found.",
      },
      carriers: {
        type: "array",
        description: "Matching carriers, most complete / best-contact first.",
        items: {
          type: "object",
          properties: {
            company: { type: "string", description: "Carrier business name." },
            province: { type: "string", description: "2-letter province code, e.g. ON, QC, AB." },
            city: { type: "string" },
            fleet_size: {
              type: "string",
              description: 'Free-form, e.g. "~25 trucks" or "Small (1-10)".',
            },
            equipment: {
              type: "array",
              items: { type: "string" },
              description: "Equipment / trailer types the carrier runs.",
            },
            phone: { type: "string" },
            email: { type: "string" },
            website: { type: "string" },
            lanes: { type: "string", description: "Free-form description of typical lanes." },
          },
          required: ["company", "province"],
        },
      },
      sources: {
        type: "array",
        description: "Web pages used as evidence.",
        items: {
          type: "object",
          properties: { title: { type: "string" }, url: { type: "string" } },
          required: ["title", "url"],
        },
      },
    },
    required: ["query_summary", "carriers", "sources"],
  },
} as const;

const SYSTEM = `You are a senior carrier-sourcing analyst at a Canadian freight brokerage.
Goal: given the user's filters, find REAL Canadian trucking carriers that match, then return them by calling the submit_leads tool.

METHOD
- Research with the web_search tool before answering. Search carrier directories, provincial registries, company websites, and contact/about pages. Run several searches to cover the requested provinces/cities and to dig up contact details.
- Only report carriers you can corroborate from search results. Never invent company names, phone numbers, emails, or websites.

QUALITY BAR
- Prefer carriers with a public phone or email and list the most complete entries first. If you can't find the full requested count WITH contacts, fill the remainder with relevant matching carriers (even without contacts) rather than returning fewer — aim for at least three-quarters of the requested count when matches exist.
- Favour small / independent carriers that fit the filters — those are the most valuable here.
- HARD CAP on fleet size: never include a carrier whose fleet exceeds the stated maximum number of trucks. Strict ceiling, not a preference.
- Use accurate 2-letter province codes. Paraphrase descriptions; never copy marketing prose.
- Treat regional sectors (e.g. QC-N) and preferred lanes as soft preferences, not reject filters.
- Omit any optional field you cannot verify (no "N/A"/placeholder values).

OUTPUT
- When finished, call submit_leads exactly once with query_summary, the carriers array, and the sources you relied on.`;

export function buildMessagesRequest(params: LeadsParams, l: "en" | "fr") {
  const userPrompt = [
    `Find ${params.count} Canadian trucking carriers matching these filters — return as close to ${params.count} as you can:`,
    `- Truck types: ${params.truck_types.join(", ")}`,
    `- Maximum fleet size: ${params.max_fleet_size} trucks (HARD CAP — never exceed this).`,
    params.provinces.length ? `- Provinces: ${params.provinces.join(", ")}` : "",
    params.sectors.length ? `- Regional sectors (soft): ${params.sectors.join(", ")}` : "",
    params.cities.length
      ? `- Cities of interest (${params.cities.length}): ${params.cities.slice(0, 60).map(formatCity).join(", ")}` +
        (params.cities.length > 60
          ? `, …and ${params.cities.length - 60} more across the selected area`
          : "")
      : "",
    params.lanes.length ? `- Preferred lanes: ${params.lanes.join(", ")}` : "",
    params.custom_instructions
      ? `\nAdditional instructions from the user (apply within the rules above): ${params.custom_instructions}`
      : "",
    "",
    l === "fr"
      ? "Field VALUES may stay in English from carrier websites. Call submit_leads with the results."
      : "Call submit_leads with the results.",
  ]
    .filter(Boolean)
    .join("\n");

  // Scale the output budget to the requested count (each carrier is ~200 output
  // tokens) so the structured result never gets truncated. Capped by the
  // sidecar's MAX_TOKENS_CAP.
  const maxTokens = Math.min(16384, 2500 + params.count * 300);

  return {
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    tools: [WEB_SEARCH_TOOL, SUBMIT_LEADS_TOOL],
    tool_choice: { type: "auto" as const },
    messages: [{ role: "user" as const, content: userPrompt }],
  };
}
