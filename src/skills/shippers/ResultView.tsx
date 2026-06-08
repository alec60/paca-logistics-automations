import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Save, RefreshCw, Ban, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ResultTable, type Column } from "../../components/ResultTable";
import { CostBadge } from "../../components/CostBadge";
import { EmptyState } from "../../components/EmptyState";
import { useSettingsStore } from "../../core/settings-store";
import { blacklistApi } from "../../core/context";
import type { ShippersParams, ShippersResult, Shipper } from "./schemas";

interface Props {
  result: ShippersResult;
  onNewSearch: () => void;
  params: ShippersParams;
}

// Column order shared by the file export and the clipboard copy.
const EXPORT_COLUMNS: { header: string; key: keyof Shipper }[] = [
  { header: "Company", key: "company" },
  { header: "Industry", key: "industry" },
  { header: "Province", key: "province" },
  { header: "City", key: "city" },
  { header: "Est. volume", key: "est_volume" },
  { header: "Freight profile", key: "freight_profile" },
  { header: "Why prospect", key: "why_prospect" },
  { header: "Lanes", key: "lanes" },
  { header: "Contact name", key: "contact_name" },
  { header: "Phone", key: "phone" },
  { header: "Email", key: "email" },
  { header: "Website", key: "website" },
];

function cellValue(r: Shipper, key: keyof Shipper): string {
  const v = r[key];
  const s = Array.isArray(v) ? v.join(", ") : (v ?? "");
  return String(s).replace(/[\t\r\n]+/g, " ").trim();
}

function toCsv(rows: Shipper[]): string {
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
function toTsv(rows: Shipper[]): string {
  const lines = [EXPORT_COLUMNS.map((c) => c.header).join("\t")];
  for (const r of rows) {
    lines.push(EXPORT_COLUMNS.map((c) => cellValue(r, c.key)).join("\t"));
  }
  return lines.join("\n");
}

export function ResultView({ result, onNewSearch }: Props) {
  const { t } = useTranslation();
  const fr = useSettingsStore((s) => s.locale) === "fr";
  const [shippers, setShippers] = useState(result.shippers);
  const [hiddenShown, setHiddenShown] = useState(false);

  async function blacklist(s: Shipper) {
    await blacklistApi.add(s.company);
    setShippers((cs) => cs.filter((x) => x.company !== s.company));
  }

  async function copyContact(s: Shipper) {
    const lines = [s.company, s.contact_name, s.phone, s.email, s.website]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(lines);
  }

  async function copyTable() {
    // Tab-separated so it pastes into Excel/Sheets as proper columns.
    await navigator.clipboard.writeText(toTsv(shippers));
  }

  async function saveCsv() {
    const blob = new Blob([toCsv(shippers)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shippers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<Shipper>[] = [
    {
      key: "company",
      header: fr ? "Entreprise" : "Company",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.company}</span>
          {r.industry && <span className="text-[11px] text-text-dim">{r.industry}</span>}
        </div>
      ),
      className: "w-[18%]",
    },
    {
      key: "location",
      header: fr ? "Lieu" : "Location",
      cell: (r) => (
        <div className="flex flex-col">
          <span>{r.city ?? "—"}</span>
          <span className="text-text-dim">{r.province}</span>
        </div>
      ),
    },
    {
      key: "freight",
      header: fr ? "Profil de fret" : "Freight profile",
      cell: (r) => (
        <div className="flex flex-col gap-0.5 text-[11px]">
          <span>{r.freight_profile ?? "—"}</span>
          {r.est_volume && <span className="text-text-dim">{r.est_volume}</span>}
        </div>
      ),
      className: "max-w-[16rem]",
    },
    {
      key: "why",
      header: fr ? "Pourquoi" : "Why prospect",
      cell: (r) => <span className="text-[11px] text-text-muted">{r.why_prospect ?? "—"}</span>,
      className: "max-w-[18rem]",
    },
    {
      key: "contact",
      header: "Contact",
      cell: (r) => (
        <div className="flex flex-col gap-0.5 text-[11px]">
          {r.contact_name && <span className="text-text-dim">{r.contact_name}</span>}
          {r.phone && <span>{r.phone}</span>}
          {r.email && <span>{r.email}</span>}
          {r.website && (
            <a
              href={r.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent"
            >
              {r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ),
    },
    { key: "lanes", header: fr ? "Trajets" : "Lanes", cell: (r) => r.lanes ?? "—", className: "max-w-xs" },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => copyContact(r)}
            aria-label={fr ? "Copier le contact" : "Copy contact"}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => blacklist(r)}
            aria-label={t("blacklist.add", { defaultValue: "Blacklist" })}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      className: "w-[1%] whitespace-nowrap",
    },
  ];

  const hiddenByBlacklist = result.blacklisted_count;

  return (
    <div className="flex flex-col gap-4 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {fr ? "Prospects expéditeurs" : "Shipper prospects"}
          </h1>
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
            <RefreshCw className="h-3.5 w-3.5" /> {fr ? "Nouveau" : "New"}
          </Button>
        </div>
      </header>

      {shippers.length === 0 ? (
        <EmptyState
          title={fr ? "Aucun prospect" : "No prospects"}
          description={fr ? "Élargissez vos filtres." : "Try widening your filters."}
        />
      ) : (
        <ResultTable<Shipper> columns={columns} rows={shippers} />
      )}

      <footer className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex flex-col gap-1">
          <span className="font-medium">Sources</span>
          <ul className="flex flex-col gap-0.5">
            {result.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent"
                >
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
              {t("result.blacklisted_hidden", {
                count: hiddenByBlacklist,
                defaultValue: `${hiddenByBlacklist} hidden by blacklist · view`,
              })}
            </button>
          )}
          {result.cost_estimate_usd != null && <CostBadge usd={result.cost_estimate_usd} />}
        </div>
      </footer>
    </div>
  );
}
