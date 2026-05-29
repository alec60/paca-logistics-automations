import type { BlacklistAPI, BlacklistEntry } from "./types";
import { getDb } from "./db";
import { logAudit } from "./audit-log";

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

// When SQLite is unavailable — the web build (GitHub Pages) has none, and the
// Tauri DB can fail for other reasons — mirror the blacklist into a localStorage
// cache so it survives reloads and never crashes a search. Same pattern as the
// history mirror; per-device only, no cross-device sync until a backend lands.
const WEB_KEY = "transport-paca-blacklist-web";

interface WebEntry {
  id: number;
  company: string;
  company_normalized: string;
  reason?: string;
  created_at: string;
}

function loadWeb(): WebEntry[] {
  try {
    const raw = localStorage.getItem(WEB_KEY);
    return raw ? (JSON.parse(raw) as WebEntry[]) : [];
  } catch {
    return [];
  }
}

function saveWeb(entries: WebEntry[]) {
  try {
    localStorage.setItem(WEB_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

function isSqliteUnavailable(err: unknown): boolean {
  return err instanceof Error && /SQLite unavailable/.test(err.message);
}

export function createBlacklistApi(): BlacklistAPI {
  return {
    async list(): Promise<BlacklistEntry[]> {
      try {
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
      } catch (err) {
        if (!isSqliteUnavailable(err))
          console.warn("[blacklist] DB unavailable, using local fallback:", err);
        return loadWeb().map((r) => ({
          id: r.id,
          company: r.company,
          reason: r.reason,
          created_at: r.created_at,
        }));
      }
    },

    async add(company: string, reason?: string): Promise<void> {
      const norm = normalizeCompany(company);
      if (!norm) return;
      try {
        const db = await getDb();
        await db.execute(
          "INSERT OR IGNORE INTO blacklisted_carriers (company, company_normalized, reason) VALUES ($1, $2, $3)",
          [company.trim(), norm, reason ?? null],
        );
      } catch (err) {
        if (!isSqliteUnavailable(err))
          console.warn("[blacklist] DB unavailable, using local fallback:", err);
        const entries = loadWeb();
        if (!entries.some((e) => e.company_normalized === norm)) {
          entries.push({
            id: Date.now(),
            company: company.trim(),
            company_normalized: norm,
            reason,
            created_at: new Date().toISOString(),
          });
          saveWeb(entries);
        }
      }
      logAudit("blacklist", `Added: ${company.trim()}`, { reason });
    },

    async remove(id: number): Promise<void> {
      try {
        const db = await getDb();
        await db.execute("DELETE FROM blacklisted_carriers WHERE id = $1", [id]);
      } catch (err) {
        if (!isSqliteUnavailable(err))
          console.warn("[blacklist] DB unavailable, using local fallback:", err);
        saveWeb(loadWeb().filter((e) => e.id !== id));
      }
      logAudit("blacklist", `Removed entry #${id}`);
    },

    async isBlacklisted(company: string): Promise<boolean> {
      const norm = normalizeCompany(company);
      if (!norm) return false;
      try {
        const db = await getDb();
        const rows = await db.select<{ id: number }[]>(
          "SELECT id FROM blacklisted_carriers WHERE company_normalized = $1 LIMIT 1",
          [norm],
        );
        return rows.length > 0;
      } catch (err) {
        if (!isSqliteUnavailable(err))
          console.warn("[blacklist] DB unavailable, using local fallback:", err);
        return loadWeb().some((e) => e.company_normalized === norm);
      }
    },

    async filterCarriers<T extends { company: string }>(carriers: T[]): Promise<T[]> {
      try {
        const db = await getDb();
        const rows = await db.select<{ company_normalized: string }[]>(
          "SELECT company_normalized FROM blacklisted_carriers",
        );
        const banned = new Set(rows.map((r) => r.company_normalized));
        return carriers.filter((c) => !banned.has(normalizeCompany(c.company)));
      } catch (err) {
        if (!isSqliteUnavailable(err))
          console.warn("[blacklist] DB unavailable, using local fallback:", err);
        const banned = new Set(loadWeb().map((e) => e.company_normalized));
        return carriers.filter((c) => !banned.has(normalizeCompany(c.company)));
      }
    },
  };
}
