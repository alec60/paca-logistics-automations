// Deep-research a single carrier on demand (the "extra research" button).
// Returns a Markdown briefing — text output, so no structured-parse fragility.
import type { Carrier } from "./schemas";
import { callSidecar, SidecarError } from "../../core/claude-client";
import { budgetApi } from "../../core/context";
import { RateLimitError } from "../../core/types";
import { ANTHROPIC_MODEL, WEB_SEARCH_TOOL } from "../../../server/lib/anthropic";
import { computeCostUsd } from "../../../server/lib/cost";

interface ContentBlock {
  type?: string;
  text?: string;
}
interface ProxyResponse {
  message: {
    content: ContentBlock[];
    usage: {
      input_tokens: number;
      output_tokens: number;
      server_tool_use?: { web_search_requests?: number };
    };
  };
}

export interface ResearchResult {
  markdown: string;
  costUsd: number;
}

const SYSTEM = `You are a freight-brokerage research analyst. Research the given Canadian trucking carrier using the web_search tool, then write a concise briefing for a broker deciding whether to work with them.
Cover what you can verify: company overview, fleet & equipment, service area & typical lanes, contact details, operating authority / safety (MC, US DOT, provincial NSC/CVOR, SAFER if relevant), reputation / reviews, and any recent news. Be explicit about what you could NOT confirm. Use short Markdown headings (##) and bullet points; keep it scannable. Paraphrase — never copy marketing text. Finish with a "## Sources" list of the URLs you used.`;

export async function researchCarrier(
  carrier: Carrier,
  instructions: string,
  locale: "en" | "fr",
): Promise<ResearchResult> {
  const focus =
    instructions.trim() ||
    (locale === "fr"
      ? "Approfondis le profil général de l'entreprise."
      : "Do a deeper background dig on the company overall.");

  // Lightweight budget gate (fails open on DB hiccups, like the leads handler).
  const est = computeCostUsd({ inputTokens: 6000, outputTokens: 1500, webSearchCalls: 3 });
  const check = await budgetApi.canAffordEstimate(est);
  if (!check.ok) {
    throw new Error(
      check.reason ?? (locale === "fr" ? "Budget dépassé." : "Budget exceeded."),
    );
  }

  const where = [carrier.city, carrier.province].filter(Boolean).join(", ");
  const known = [
    carrier.website ? `Website: ${carrier.website}` : "",
    carrier.phone ? `Phone: ${carrier.phone}` : "",
    carrier.email ? `Email: ${carrier.email}` : "",
    carrier.fleet_size ? `Reported fleet: ${carrier.fleet_size}` : "",
    carrier.equipment.length ? `Equipment: ${carrier.equipment.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    `Carrier: ${carrier.company}${where ? ` — ${where}` : ""}`,
    known,
    "",
    `Focus: ${focus}`,
  ]
    .filter(Boolean)
    .join("\n");

  let response: ProxyResponse;
  try {
    response = await callSidecar<ProxyResponse>("/api/claude/messages", {
      method: "POST",
      body: {
        request: {
          model: ANTHROPIC_MODEL,
          max_tokens: 3000,
          system: SYSTEM,
          tools: [WEB_SEARCH_TOOL],
          messages: [{ role: "user" as const, content: userPrompt }],
        },
      },
    });
  } catch (err) {
    if (err instanceof SidecarError && err.status === 429) {
      throw new RateLimitError(
        locale === "fr"
          ? "Limite de débit atteinte. Réessayez bientôt."
          : "Rate limit hit. Try again shortly.",
        60,
      );
    }
    throw err;
  }

  const markdown = response.message.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();

  const cost = computeCostUsd({
    inputTokens: response.message.usage.input_tokens || 0,
    outputTokens: response.message.usage.output_tokens || 0,
    webSearchCalls: response.message.usage.server_tool_use?.web_search_requests ?? 0,
  });
  try {
    await budgetApi.logSpend(cost, "leads-research", { company: carrier.company });
  } catch {
    // best-effort
  }

  if (!markdown) {
    throw new Error(
      locale === "fr" ? "Aucun résultat de recherche." : "No research results returned.",
    );
  }
  return { markdown, costUsd: cost };
}
