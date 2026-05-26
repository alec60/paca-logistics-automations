import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../core/settings-store";

// Phase 2 wires this to the BudgetAPI. Phase 1 shows a static $0 / limit bar.
export function BudgetMeter() {
  const { t } = useTranslation();
  const limit = useSettingsStore((s) => s.monthlyBudgetUsd);
  const spend = 0;
  const pct = limit > 0 ? Math.min(100, (spend / limit) * 100) : 0;
  const color =
    pct < 50 ? "bg-success" : pct < 80 ? "bg-warning" : "bg-danger";

  return (
    <div className="flex items-center gap-2">
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
