import { describe, expect, it } from "vitest";
import { computeCostUsd, estimateLeadSearchCost, PRICING } from "../../server/lib/cost";

describe("computeCostUsd", () => {
  it("returns 0 for zero usage", () => {
    expect(computeCostUsd({ inputTokens: 0, outputTokens: 0, webSearchCalls: 0 })).toBe(0);
  });

  it("prices 1M input tokens at the Sonnet rate", () => {
    const cost = computeCostUsd({ inputTokens: 1_000_000, outputTokens: 0, webSearchCalls: 0 });
    expect(cost).toBeCloseTo(PRICING.inputPerMillion, 6);
  });

  it("prices 1M output tokens at the Sonnet rate", () => {
    const cost = computeCostUsd({ inputTokens: 0, outputTokens: 1_000_000, webSearchCalls: 0 });
    expect(cost).toBeCloseTo(PRICING.outputPerMillion, 6);
  });

  it("adds 1 cent per web search call", () => {
    const cost = computeCostUsd({ inputTokens: 0, outputTokens: 0, webSearchCalls: 5 });
    expect(cost).toBeCloseTo(0.05, 6);
  });

  it("combines all three components", () => {
    const cost = computeCostUsd({ inputTokens: 1500, outputTokens: 2000, webSearchCalls: 4 });
    // 1500/1M * 3 + 2000/1M * 15 + 4*0.01 = 0.0045 + 0.03 + 0.04 = 0.0745
    expect(cost).toBeCloseTo(0.0745, 6);
  });
});

describe("estimateLeadSearchCost", () => {
  it("returns a positive estimate for a default search", () => {
    const c = estimateLeadSearchCost({ leads: 10, provinces: 2, lanes: 2 });
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1); // sanity — shouldn't blow past $1
  });

  it("scales up with more leads", () => {
    const a = estimateLeadSearchCost({ leads: 5, provinces: 1, lanes: 1 });
    const b = estimateLeadSearchCost({ leads: 50, provinces: 1, lanes: 1 });
    expect(b).toBeGreaterThan(a);
  });

  it("caps web_search calls at 6", () => {
    // 100 provinces and 100 lanes would otherwise blow past 6; ensure cap by
    // checking cost doesn't exceed the 6-call ceiling delta vs zero searches.
    const big = estimateLeadSearchCost({ leads: 1, provinces: 100, lanes: 100 });
    const minimal = estimateLeadSearchCost({ leads: 1, provinces: 1, lanes: 1 });
    expect(big - minimal).toBeLessThanOrEqual(0.06 + 1e-6); // (6 - 3) * 0.01 = 0.03 max delta
  });
});
