import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Save, RefreshCw, Ban, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ResultTable, type Column } from "../../components/ResultTable";
import { CostBadge } from "../../components/CostBadge";
import { CarrierResearch } from "../../components/CarrierResearch";
import { EmptyState } from "../../components/EmptyState";
import { blacklistApi } from "../../core/context";
import type { LeadsParams, LeadsResult, Carrier } from "./schemas";

interface Props {
  result: LeadsResult;
  onNewSearch: () => void;
  params: LeadsParams;
}

// Column order shared by the file export and the clipboard copy.
const EXPORT_COLUMNS: { header: string; key: keyof Carrier }[] = [
  { header: "Company", key: "company" },
  { header: "Province", key: "province" },
  { header: "City", key: "city" },
  { header: "Fleet size", key: "fleet_size" },
  { header: "Equipment", key: "equipment" },
  { header: "Phone", key: "phone" },
  { header: "Email", key: "email" },
  { header: "Website", key: "website" },
  { header: "Lanes", key: "lanes" },
];

function cellValue(r: Carrier, key: keyof Carrier): string {
  const v = r[key];
  const s = Array.isArray(v) ? v.join(", ") : (v ?? "");
  return String(s).replace(/[\t\r\n]+/g, " ").trim();
}

function toCsv(rows: Carrier[]): string {
  const lines = [EXPORT_COLUMNS.map((c) => c.header).join(",")];
  for (const r of rows) {
    lines.push(
      EXPORT_COLUMNS.map((c) => `"${cellValue(r, c.key).replace(/"/g, '""')}"`).join(","),
    );
  }
  return lines.join("\n");
}

// Tab-separated — pastes straight into Excel / Google Sheets as clean columns
// (pasting comma-CSV dumps everything into one column, which is unreadable).
function toTsv(rows: Carrier[]): string {
  const lines = [EXPORT_COLUMNS.map((c) => c.header).join("\t")];
  for (const r of rows) {
    lines.push(EXPORT_COLUMNS.map((c) => cellValue(r, c.key)).join("\t"));
  }
  return lines.join("\n");
}

export function ResultView({ result, onNewSearch }: Props) {
  const { t, i18n } = useTranslation();
  const [carriers, setCarriers] = useState(result.carriers);
  const [hiddenShown, setHiddenShown] = useState(false);

  const blacklist = useCallback(async (c: Carrier) => {
    await blacklistApi.add(c.company);
    setCarriers((cs) => cs.filter((x) => x.company !== c.company));
  }, []);

  const copyContact = useCallback(async (c: Carrier) => {
    const lines = [c.company, c.phone, c.email, c.website].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(lines);
  }, []);

  async function copyTable() {
    // Tab-separated so it pastes into Excel/Sheets as proper columns.
    await navigator.clipboard.writeText(toTsv(carriers));
  }

  async function saveCsv() {
    const blob = new Blob([toCsv(carriers)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<Column<Carrier>[]>(() => [
    {
      key: "company",
      header: i18n.language.startsWith("fr") ? "Entreprise" : "Company",
      cell: (r) => <span className="font-medium">{r.company}</span>,
      className: "w-[20%]",
    },
    {
      key: "location",
      header: "Location",
      cell: (r) => (
        <div className="flex flex-col">
          <span>{r.city ?? "—"}</span>
          <span className="text-text-dim">{r.province}</span>
        </div>
      ),
    },
    { key: "fleet", header: "Fleet", cell: (r) => r.fleet_size ?? "—" },
    {
      key: "equipment",
      header: "Equipment",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.equipment.map((e) => (
            <span key={e} className="rounded-sm bg-surface-3 px-1.5 py-0.5 text-[10px]">
              {e}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (r) => (
        <div className="flex flex-col gap-0.5 text-[11px]">
          {r.phone && <span>{r.phone}</span>}
          {r.email && <span>{r.email}</span>}
          {r.website && (
            <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent">
              {r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ),
    },
    { key: "lanes", header: "Lanes", cell: (r) => r.lanes ?? "—", className: "max-w-xs" },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <div className="flex items-center gap-1">
          <CarrierResearch carrier={r} />
          <Button size="icon" variant="ghost" onClick={() => copyContact(r)} aria-label={t("blacklist.add")}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => blacklist(r)} aria-label={t("blacklist.add")}>
            <Ban className="h-3.5 w-3.5" />
          </Button>
          {/* CRM integration is a future skill — button removed until it ships
              (audit P3.15 — non-functional UI in production looked broken). */}
        </div>
      ),
      className: "w-[1%] whitespace-nowrap",
    },
  ], [t, i18n.language, copyContact, blacklist]);

  const hiddenByBlacklist = result.blacklisted_count;

  return (
    <div className="flex flex-col gap-4 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transport Paca</h1>
          <p className="mt-1 text-sm text-text-muted">{result.query_summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={copyTable}
            title={t("result.actions.copy_table_hint", {
              defaultValue: "Pastes into Excel/Sheets as columns",
            })}
          >
            <Copy className="h-3.5 w-3.5" />{" "}
            {t("result.actions.copy_table", { defaultValue: "Copy" })}
          </Button>
          <Button size="sm" variant="outline" onClick={saveCsv}>
            <Save className="h-3.5 w-3.5" /> .csv
          </Button>
          <Button size="sm" variant="outline" onClick={onNewSearch}>
            <RefreshCw className="h-3.5 w-3.5" /> New
          </Button>
          {/* "More leads" (append to current result) belongs in a follow-up
              once the runner supports param-merge. Hidden until then so the
              button doesn't lie about its behavior. */}
        </div>
      </header>

      {carriers.length === 0 ? (
        <EmptyState title="No carriers" description="Try widening your filters." />
      ) : (
        <ResultTable<Carrier> columns={columns} rows={carriers} />
      )}

      <footer className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex flex-col gap-1">
          <span className="font-medium">Sources</span>
          <ul className="flex flex-col gap-0.5">
            {result.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent">
                  {s.title} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-3">
          {hiddenByBlacklist > 0 && (
            <button
              type="button"
              onClick={() => setHiddenShown(!hiddenShown)}
              className="text-accent hover:underline"
            >
              {t("result.blacklisted_hidden", { count: hiddenByBlacklist, defaultValue: `${hiddenByBlacklist} hidden by blacklist · view` })}
            </button>
          )}
          {result.cost_estimate_usd != null && <CostBadge usd={result.cost_estimate_usd} />}
        </div>
      </footer>
    </div>
  );
}
