// City type-ahead, filtered by selected provinces. Pin to keep favourites at
// the top. With `byKey`, options are individual places (name + province) and
// selections are stored as "name|province" keys so duplicate town names don't
// collide; without it (shippers), selections are bare names.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, X, Search } from "lucide-react";
import { CITIES, CITY_TO_PROVINCE, PLACES, cityKey } from "../skills/leads/data";
import { useSettingsStore } from "../core/settings-store";
import { cn } from "../lib/utils";

interface Props {
  selectedCities: string[]; // names, or "name|province" keys when byKey
  selectedProvinces: string[]; // narrow the dropdown
  onToggleCity: (value: string) => void;
  hideSelected?: boolean;
  byKey?: boolean;
}

interface Opt {
  key: string;
  name: string;
  province: string;
  pop: number;
}

export function CitySearch({
  selectedCities,
  selectedProvinces,
  onToggleCity,
  hideSelected = false,
  byKey = false,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const pinned = useSettingsStore((s) => s.pinnedCities);
  const togglePinned = useSettingsStore((s) => s.togglePinnedCity);

  const filtered = useMemo<Opt[]>(() => {
    const q = query.trim().toLowerCase();
    // Stay hidden until the user gives a signal: 2+ typed chars or a province.
    if (q.length < 2 && selectedProvinces.length === 0) return [];
    const provSet = new Set(selectedProvinces);
    const out: Opt[] = [];
    if (byKey) {
      for (const p of PLACES) {
        if (provSet.size && !provSet.has(p.province)) continue;
        if (q && !p.name.toLowerCase().includes(q)) continue;
        out.push({ key: cityKey(p.name, p.province), name: p.name, province: p.province, pop: p.pop });
      }
    } else {
      for (const name of CITIES) {
        const province = CITY_TO_PROVINCE[name];
        if (provSet.size && !provSet.has(province)) continue;
        if (q && !name.toLowerCase().includes(q)) continue;
        out.push({ key: name, name, province, pop: 0 });
      }
    }
    out.sort((a, b) => {
      const ap = pinned.includes(a.name);
      const bp = pinned.includes(b.name);
      if (ap !== bp) return ap ? -1 : 1;
      return a.name.localeCompare(b.name, "en") || b.pop - a.pop;
    });
    return out.slice(0, 60);
  }, [query, selectedProvinces, pinned, byKey]);

  const selectedSet = useMemo(() => new Set(selectedCities), [selectedCities]);

  return (
    <div className="flex flex-col gap-2">
      {/* Selected chips */}
      {!hideSelected && selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCities.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-pill bg-gradient-accent px-3 py-1 text-xs font-medium text-accent-text"
            >
              {c}
              <button
                type="button"
                onClick={() => onToggleCity(c)}
                aria-label={`Remove ${c}`}
                className="opacity-80 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            selectedProvinces.length === 0
              ? t("leads.city_search_all", { defaultValue: "Search cities…" })
              : t("leads.city_search_filtered", {
                  defaultValue: `Search cities in ${selectedProvinces.join(", ")}…`,
                  provinces: selectedProvinces.join(", "),
                })
          }
          className="h-10 w-full rounded-pill border border-transparent bg-input-bg pl-9 pr-3 text-sm text-input-text placeholder:text-input-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          aria-label="City search"
        />
      </div>

      {/* Dropdown */}
      {filtered.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-lg bg-input-bg">
          <ul role="listbox" aria-label="City results" className="divide-y divide-border-subtle">
            {filtered.map((o) => {
              const isSelected = selectedSet.has(o.key);
              const isPinned = pinned.includes(o.name);
              return (
                <li
                  key={o.key}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 text-sm text-input-text",
                    isSelected && "bg-accent-bg text-accent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleCity(o.key)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span>{o.name}</span>
                    <span className="text-[10px] text-input-placeholder">{o.province}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePinned(o.name)}
                    aria-label={isPinned ? `Unpin ${o.name}` : `Pin ${o.name}`}
                    title={isPinned ? "Unpin" : "Pin"}
                    className={cn(
                      "ml-2 rounded-pill p-1",
                      isPinned ? "text-accent" : "text-input-placeholder hover:text-input-text",
                    )}
                  >
                    {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {filtered.length === 0 && query && (
        <div className="rounded-md border border-border-subtle bg-surface-1 p-3 text-xs text-text-dim">
          {t("leads.city_no_match", {
            defaultValue: "No matching cities in the selected provinces.",
          })}
        </div>
      )}
    </div>
  );
}
