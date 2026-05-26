import type { BudgetAPI } from "./types";

// Phase 2 implements the SQLite-backed BudgetAPI. Phase 1 returns a no-op stub.
export function createBudgetApi(): BudgetAPI {
  return {
    getMonthlyLimit: async () => 20,
    getCurrentSpend: async () => 0,
    getPercentUsed: async () => 0,
    canAffordEstimate: async () => ({ ok: true }),
    logSpend: async () => undefined,
  };
}
