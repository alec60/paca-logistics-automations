// City search with type-ahead, filtered by selected provinces. Pin to keep
// favorites at the top across sessions. Pinned list lives in Zustand.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, X, Search } from "lucide-react";
import { CITIES, CITY_TO_PROVINCE } from "../skills/leads/data";
import { useSettingsStore } from "../core/settings-store";
import { cn } from "../lib/utils";

interface Props {
  selectedCities: string[];
  selectedProvinces: string[]; // narrow the dropdown
  onToggleCity: (city: string) => void;
}

export function CitySearch({ selectedCities, selectedProvinces, onToggleCity }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const pinned = useSettingsStore((s) => s.pinnedCities);
  const togglePinned = useSettingsStore((s) => s.togglePinnedCity);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Stay hidden until the user gives us a signal: at least 2 typed chars or
    // any province narrowing. With 300+ cities loaded we can't dump them all.
    if (q.length < 2 && selectedProvinces.length === 0) return [];

    const provinceSet = new Set(selectedProvinces);
    const provinceFilter = provinceSet.size === 0
      ? () => true
      : (city: string) => provinceSet.has(CITY_TO_PROVINCE[city]);

    return CITIES.filter(provinceFilter)
      .filter((c) => (q ? c.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const ap = pinned.includes(a);
        const bp = pinned.includes(b);
        if (ap !== bp) return ap ? -1 : 1;
        return a.localeCompare(b);
      })
      .slice(0, 60); // cap dropdown size
  }, [query, selectedProvinces, pinned]);

  return (
    <div className="flex flex-col gap-2">
      {/* Selected chips */}
      {selectedCities.length > 0 && (
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
              ? t("leads.city_search_all", {
                  defaultValue: "Search cities…",
                })
              : t("leads.city_search_filtered", {
                  defaultValue: `Search cities in ${selectedProvinces.join(", ")}…`,
                  provinces: selectedProvinces.join(", "),
                })
          }
          className="h-10 w-full rounded-pill border border-transparent bg-input-bg pl-9 pr-3 text-sm text-input-text placeholder:text-input-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          aria-label="City search"
        />
      </div>

      {/* Dropdown — light surface to match the reference dashboard */}
      {filtered.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-lg bg-input-bg">
          <ul role="listbox" aria-label="City results" className="divide-y divide-black/5">
            {filtered.map((city) => {
              const isSelected = selectedCities.includes(city);
              const isPinned = pinned.includes(city);
              return (
                <li
                  key={city}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 text-sm text-input-text",
                    isSelected && "bg-accent-bg text-accent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleCity(city)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span>{city}</span>
                    <span className="text-[10px] text-input-placeholder">
                      {CITY_TO_PROVINCE[city]}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePinned(city)}
                    aria-label={isPinned ? `Unpin ${city}` : `Pin ${city}`}
                    title={isPinned ? "Unpin" : "Pin"}
                    className={cn(
                      "ml-2 rounded-pill p-1",
                      isPinned ? "text-accent" : "text-input-placeholder hover:text-input-text",
                    )}
                  >
                    {isPinned ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
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
