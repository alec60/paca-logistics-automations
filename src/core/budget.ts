import type { BudgetAPI } from "./types";
import { getDb } from "./db";

const DEFAULT_LIMIT = 20;

function monthStartIso(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d.toISOString();
}

// The budget gate is a soft cap and must NEVER block a search because of a
// DB problem. On the web build SQLite is simply absent (expected); inside
// Tauri the DB can still fail for other reasons (stale schema, locked file).
// Either way readers return safe defaults and writers no-op — we fail OPEN.
// Unexpected (non-web) errors are logged so they stay diagnosable.
function isSqliteUnavailable(err: unknown): boolean {
  return err instanceof Error && /SQLite unavailable/.test(err.message);
}

function warnDbError(where: string, err: unknown): void {
  if (!isSqliteUnavailable(err)) {
    console.warn(`[budget] ${where} — DB unavailable, degrading:`, err);
  }
}

export function createBudgetApi(): BudgetAPI {
  async function readLimit(): Promise<number> {
    try {
      const db = await getDb();
      const rows = await db.select<{ value: string }[]>(
        "SELECT value FROM settings WHERE key = 'monthly_budget_usd' LIMIT 1",
      );
      const v = rows[0]?.value;
      const n = v ? Number(v) : NaN;
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
    } catch (err) {
      warnDbError("readLimit", err);
      return DEFAULT_LIMIT;
    }
  }

  async function readSpend(): Promise<number> {
    try {
      const db = await getDb();
      const rows = await db.select<{ total: number | null }[]>(
        "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM spend_log WHERE logged_at >= $1",
        [monthStartIso()],
      );
      return Number(rows[0]?.total ?? 0);
    } catch (err) {
      warnDbError("readSpend", err);
      return 0;
    }
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
      try {
        const db = await getDb();
        await db.execute(
          "INSERT INTO spend_log (skill_slug, amount_usd, meta_json) VALUES ($1, $2, $3)",
          [skillSlug, usd, meta ? JSON.stringify(meta) : null],
        );
      } catch (err) {
        warnDbError("logSpend", err);
        // No persistent log when the DB is unavailable — best effort only.
      }
    },
  };
}

export async function setMonthlyLimit(usd: number): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      "INSERT INTO settings (key, value, updated_at) VALUES ('monthly_budget_usd', $1, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
      [String(usd)],
    );
  } catch (err) {
    warnDbError("setMonthlyLimit", err);
  }
}
