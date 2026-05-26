import type { BudgetAPI } from "./types";
import { getDb } from "./db";

const DEFAULT_LIMIT = 20;

function monthStartIso(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d.toISOString();
}

export function createBudgetApi(): BudgetAPI {
  async function readLimit(): Promise<number> {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      "SELECT value FROM settings WHERE key = 'monthly_budget_usd' LIMIT 1",
    );
    const v = rows[0]?.value;
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
  }

  async function readSpend(): Promise<number> {
    const db = await getDb();
    const rows = await db.select<{ total: number | null }[]>(
      "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM spend_log WHERE logged_at >= $1",
      [monthStartIso()],
    );
    return Number(rows[0]?.total ?? 0);
  }

  return {
    getMonthlyLimit: readLimit,
    getCurrentSpend: readSpend,
    async getPercentUsed(): Promise<number> {
      const [limit, spend] = await Promise.all([readLimit(), readSpend()]);
      if (limit <= 0) return 100;
      return Math.min(100, (spend / limit) * 100);
    },
    async canAffordEstimate(estimateUsd: number): Promise<{ ok: boolean; reason?: string }> {
      const [limit, spend] = await Promise.all([readLimit(), readSpend()]);
      const projected = spend + estimateUsd;
      if (projected > limit) {
        return {
          ok: false,
          reason: `Monthly budget exceeded ($${spend.toFixed(2)} + $${estimateUsd.toFixed(2)} est > $${limit.toFixed(2)}). Open settings to raise the limit.`,
        };
      }
      return { ok: true };
    },
    async logSpend(usd: number, skillSlug: string, meta?: object): Promise<void> {
      const db = await getDb();
      await db.execute(
        "INSERT INTO spend_log (skill_slug, amount_usd, meta_json) VALUES ($1, $2, $3)",
        [skillSlug, usd, meta ? JSON.stringify(meta) : null],
      );
    },
  };
}

export async function setMonthlyLimit(usd: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value, updated_at) VALUES ('monthly_budget_usd', $1, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    [String(usd)],
  );
}
