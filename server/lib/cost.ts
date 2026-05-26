// Token-usage → USD. Sonnet 4.5 pricing as of v0.1.0.
// Update from https://www.anthropic.com/pricing when rates change.
export const PRICING = {
  inputPerMillion: 3,
  outputPerMillion: 15,
  webSearchPerCall: 0.01,
} as const;

export interface UsageInput {
  inputTokens: number;
  outputTokens: number;
  webSearchCalls: number;
}

export function computeCostUsd({ inputTokens, outputTokens, webSearchCalls }: UsageInput): number {
  return (
    (inputTokens / 1_000_000) * PRICING.inputPerMillion +
    (outputTokens / 1_000_000) * PRICING.outputPerMillion +
    webSearchCalls * PRICING.webSearchPerCall
  );
}

// Rough estimate used for pre-call budget checks. ~3-6 web searches + a few
// thousand input + output tokens. Tuned conservatively.
export function estimateLeadSearchCost(opts: { leads: number; provinces: number; lanes: number }): number {
  const searches = Math.min(6, Math.max(3, Math.ceil((opts.provinces + opts.lanes) / 4)));
  return computeCostUsd({
    inputTokens: 1500 + opts.leads * 80,
    outputTokens: 2000 + opts.leads * 200,
    webSearchCalls: searches,
  });
}
