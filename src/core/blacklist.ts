import type { BlacklistAPI, BlacklistEntry } from "./types";

// Phase 2 implements the full SQLite-backed BlacklistAPI. Phase 1 returns a no-op stub
// so the skill context type-checks.
export function createBlacklistApi(): BlacklistAPI {
  const list = async (): Promise<BlacklistEntry[]> => [];
  return {
    list,
    add: async () => undefined,
    remove: async () => undefined,
    isBlacklisted: async () => false,
    filterCarriers: async (carriers) => carriers,
  };
}

export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|corp|corporation|company|co|transport|transports|trucking)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
