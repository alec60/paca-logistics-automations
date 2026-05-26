import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { budgetApi } from "../core/context";

export function BudgetMeter() {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(20);
  const [spend, setSpend] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [l, s] = await Promise.all([
          budgetApi.getMonthlyLimit(),
          budgetApi.getCurrentSpend(),
        ]);
        if (!cancelled) {
          setLimit(l);
          setSpend(s);
          setReady(true);
        }
      } catch {
        // Db not ready (e.g. first paint pre-Tauri-init) — silently retry once.
        if (!cancelled) setTimeout(load, 500);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pct = limit > 0 ? Math.min(100, (spend / limit) * 100) : 0;
  const color = pct < 50 ? "bg-success" : pct < 80 ? "bg-warning" : "bg-danger";

  return (
    <div className="flex items-center gap-2" aria-busy={!ready}>
      <span className="font-mono text-xs text-text-muted">
        ${spend.toFixed(2)} / ${limit.toFixed(0)}
      </span>
      <div
        className="h-1.5 w-24 overflow-hidden rounded bg-surface-3"
        role="progressbar"
        aria-label={t("budget.label")}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
