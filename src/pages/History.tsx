// Search history list. Reads from SQLite (durable) AND the Zustand mirror
// (localStorage fallback). Whichever has more entries wins.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History as HistoryIcon } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { getDb } from "../core/db";
import { useSettingsStore, type HistoryEntry } from "../core/settings-store";

export function HistoryPage() {
  const { t } = useTranslation();
  const mirror = useSettingsStore((s) => s.historyMirror);
  const [rows, setRows] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"sqlite" | "localStorage">("localStorage");

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const r = await db.select<HistoryEntry[]>(
          "SELECT id, skill_slug, params_json, cost_usd, searched_at FROM search_history ORDER BY searched_at DESC LIMIT 100",
        );
        if (r.length >= mirror.length) {
          setRows(r);
          setSource("sqlite");
        } else {
          setRows(mirror);
        }
      } catch {
        setRows(mirror);
      } finally {
        setLoading(false);
      }
    })();
  }, [mirror]);

  if (loading) return <div className="p-8 text-text-muted">{t("common.loading")}</div>;
  if (rows.length === 0)
    return (
      <div className="p-8">
        <EmptyState icon={HistoryIcon} title={t("app.sidebar.history")} />
      </div>
    );

  return (
    <div className="p-8">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("app.sidebar.history")}</h1>
        <span className="font-mono text-[10px] text-text-dim">{source}</span>
      </header>
      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-1">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div>
              <div className="font-mono text-xs text-text-muted">{r.skill_slug}</div>
              <div>{new Date(r.searched_at).toLocaleString()}</div>
            </div>
            {r.cost_usd != null && (
              <span className="font-mono text-xs text-text-muted">
                ${r.cost_usd.toFixed(3)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
