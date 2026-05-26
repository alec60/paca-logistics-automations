import type { BlacklistAPI, BlacklistEntry } from "./types";
import { getDb } from "./db";

export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|corp|corporation|company|co|transport|transports|trucking)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

interface Row {
  id: number;
  company: string;
  company_normalized: string;
  reason: string | null;
  created_at: string;
}

export function createBlacklistApi(): BlacklistAPI {
  return {
    async list(): Promise<BlacklistEntry[]> {
      const db = await getDb();
      const rows = await db.select<Row[]>(
        "SELECT id, company, company_normalized, reason, created_at FROM blacklisted_carriers ORDER BY company COLLATE NOCASE",
      );
      return rows.map((r) => ({
        id: r.id,
        company: r.company,
        reason: r.reason ?? undefined,
        created_at: r.created_at,
      }));
    },

    async add(company: string, reason?: string): Promise<void> {
      const db = await getDb();
      const norm = normalizeCompany(company);
      if (!norm) return;
      await db.execute(
        "INSERT OR IGNORE INTO blacklisted_carriers (company, company_normalized, reason) VALUES ($1, $2, $3)",
        [company.trim(), norm, reason ?? null],
      );
    },

    async remove(id: number): Promise<void> {
      const db = await getDb();
      await db.execute("DELETE FROM blacklisted_carriers WHERE id = $1", [id]);
    },

    async isBlacklisted(company: string): Promise<boolean> {
      const db = await getDb();
      const norm = normalizeCompany(company);
      if (!norm) return false;
      const rows = await db.select<{ id: number }[]>(
        "SELECT id FROM blacklisted_carriers WHERE company_normalized = $1 LIMIT 1",
        [norm],
      );
      return rows.length > 0;
    },

    async filterCarriers<T extends { company: string }>(carriers: T[]): Promise<T[]> {
      const db = await getDb();
      const rows = await db.select<{ company_normalized: string }[]>(
        "SELECT company_normalized FROM blacklisted_carriers",
      );
      const banned = new Set(rows.map((r) => r.company_normalized));
      return carriers.filter((c) => !banned.has(normalizeCompany(c.company)));
    },
  };
}
