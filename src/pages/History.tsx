// Search-history list. Full UI lands in Phase 4 polish.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History as HistoryIcon } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { getDb } from "../core/db";

interface Row {
  id: number;
  skill_slug: string;
  params_json: string;
  cost_usd: number | null;
  searched_at: string;
}

export function HistoryPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const r = await db.select<Row[]>(
          "SELECT id, skill_slug, params_json, cost_usd, searched_at FROM search_history ORDER BY searched_at DESC LIMIT 100",
        );
        setRows(r);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-text-muted">{t("common.loading")}</div>;
  if (rows.length === 0)
    return (
      <div className="p-8">
        <EmptyState icon={HistoryIcon} title={t("app.sidebar.history")} />
      </div>
    );

  return (
    <div className="p-8">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{t("app.sidebar.history")}</h1>
      <ul className="divide-y divide-border-subtle rounded border border-border-subtle">
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
