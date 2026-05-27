// Top-row quick-pick buttons that bulk-add region groups (Maritimes,
// Prairies, etc.). Each region applies its preset province codes to the
// selection set. Tap once to add; tap again to remove the whole set.
import { REGIONS, type RegionKey } from "../skills/leads/data";
import { useSettingsStore } from "../core/settings-store";
import { cn } from "../lib/utils";

interface Props {
  selectedProvinces: string[];
  onSet: (codes: string[]) => void;
}

const ORDER: RegionKey[] = ["western", "prairies", "central", "maritimes", "territories", "all"];

export function RegionPicker({ selectedProvinces, onSet }: Props) {
  const locale = useSettingsStore((s) => s.locale);

  function isRegionActive(key: RegionKey) {
    const codes = REGIONS[key].codes;
    return codes.every((c) => selectedProvinces.includes(c));
  }

  function toggle(key: RegionKey) {
    const codes = REGIONS[key].codes as readonly string[];
    if (isRegionActive(key)) {
      onSet(selectedProvinces.filter((c) => !codes.includes(c)));
    } else {
      const next = new Set<string>([...selectedProvinces, ...codes]);
      onSet([...next]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
        {locale === "fr" ? "Régions" : "Regions"}
      </span>
      {ORDER.map((key) => {
        const active = isRegionActive(key);
        const r = REGIONS[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            aria-pressed={active}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-medium",
              active
                ? "bg-gradient-accent text-accent-text shadow-glow"
                : "border border-border-subtle bg-surface-2 text-text-muted hover:border-border hover:text-text",
            )}
          >
            {locale === "fr" ? r.labelFr : r.labelEn}
          </button>
        );
      })}
    </div>
  );
}
