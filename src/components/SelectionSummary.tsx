// One collapsible box that shows everything currently selected — provinces
// (with their N/S/E/W sectors) and cities — in a single scrollable list, so
// the whole picker stays on one screen. Click the header to expand/collapse.
import { ChevronDown, MapPin, X } from "lucide-react";
import { PROVINCES } from "../skills/leads/data";
import { useSettingsStore } from "../core/settings-store";

interface Props {
  provinces: string[];
  sectors: string[]; // "QC-N" — shown as sub-tags on their province chip
  cities: string[];
  onRemoveProvince: (code: string) => void;
  onRemoveCity: (city: string) => void;
  onClear: () => void;
}

const NAME: Record<string, { en: string; fr: string }> = Object.fromEntries(
  PROVINCES.map((p) => [p.code, { en: p.nameEn, fr: p.nameFr }]),
);

// Paint can select thousands of towns; cap how many chips we draw (the full
// selection is kept — this is display only).
const CITY_CHIP_CAP = 200;

export function SelectionSummary({
  provinces,
  sectors,
  cities,
  onRemoveProvince,
  onRemoveCity,
  onClear,
}: Props) {
  const fr = useSettingsStore((s) => s.locale) === "fr";
  const total = provinces.length + cities.length;

  return (
    <details className="group rounded-lg border border-border-subtle bg-surface-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4 text-text-muted" />
          {fr ? "Sélection" : "Selection"}
          <span className="rounded-pill bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-text-muted">
            {total}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {total > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClear();
                }
              }}
              className="text-[11px] text-text-dim hover:text-danger"
            >
              {fr ? "Tout effacer" : "Clear all"}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-text-muted transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="max-h-40 overflow-y-auto px-3 pb-2">
        {total === 0 ? (
          <p className="py-1 text-xs text-text-dim">
            {fr
              ? "Rien de sélectionné — cliquez la carte ou cherchez des villes."
              : "Nothing selected — click the map or search cities."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {provinces.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {provinces.map((code) => {
                  const dirs = sectors
                    .filter((s) => s.startsWith(`${code}-`))
                    .map((s) => s.split("-")[1]);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 rounded-pill bg-gradient-accent px-2.5 py-1 text-xs font-medium text-accent-text"
                    >
                      {fr ? NAME[code]?.fr ?? code : NAME[code]?.en ?? code}
                      {dirs.length > 0 && (
                        <span className="font-mono text-[10px] opacity-80">{dirs.join("")}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveProvince(code)}
                        aria-label={`Remove ${code}`}
                        className="opacity-80 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cities.slice(0, CITY_CHIP_CAP).map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-pill bg-surface-3 px-2.5 py-1 text-xs font-medium text-text"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => onRemoveCity(c)}
                      aria-label={`Remove ${c}`}
                      className="opacity-70 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {cities.length > CITY_CHIP_CAP && (
                  <span className="inline-flex items-center rounded-pill bg-surface-3 px-2.5 py-1 text-xs font-medium text-text-muted">
                    +{(cities.length - CITY_CHIP_CAP).toLocaleString()} {fr ? "autres" : "more"}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
