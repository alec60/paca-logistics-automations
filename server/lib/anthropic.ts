// Anthropic SDK client factory and shared constants.
import Anthropic from "@anthropic-ai/sdk";

export const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

export function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// web_search tool spec — Anthropic's hosted server-side search tool.
// Each search round injects ~5–10k tokens of page content back into the prompt
// (the dominant driver of per-call input tokens). On Tier 2 (450k ITPM) there's
// plenty of headroom, so we allow more rounds for broader/deeper coverage.
// See https://docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool
export const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search" as const,
  max_uses: 5,
};
