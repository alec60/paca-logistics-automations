// Territories live above the Canada map per spec. Same selection model as
// provinces: each is a labeled pill that, when active, swaps in a small NSEW
// row for regional sectors.
import { TERRITORY_CODES, type ProvinceCode } from "../skills/leads/data";
import { cn } from "../lib/utils";

interface Props {
  selectedProvinces: string[];
  sectors: string[];
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleSector: (sector: string) => void;
}

const TERRITORY_NAMES_EN: Record<string, string> = {
  YT: "Yukon",
  NT: "Northwest Territories",
  NU: "Nunavut",
};

export function TerritoryRow({
  selectedProvinces,
  sectors,
  onToggleProvince,
  onToggleSector,
}: Props) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <div className="flex items-center pr-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
          Territories
        </span>
      </div>
      {TERRITORY_CODES.map((code) => {
        const isSelected = selectedProvinces.includes(code);
        if (!isSelected) {
          return (
            <button
              key={code}
              type="button"
              onClick={() => onToggleProvince(code as ProvinceCode)}
              className={cn(
                "group flex items-center gap-2 rounded-pill border border-border-subtle bg-surface-1 px-4 py-2",
                "text-text-muted hover:border-border hover:bg-surface-2 hover:text-text",
              )}
              title={TERRITORY_NAMES_EN[code]}
            >
              <span className="font-mono text-sm font-semibold tracking-widest">
                {code}
              </span>
            </button>
          );
        }
        return (
          <div
            key={code}
            className="flex items-center gap-2 rounded-pill border border-accent bg-accent-bg px-3 py-1.5"
            aria-label={`${code} selected`}
          >
            <span className="font-mono text-xs font-semibold tracking-widest text-accent">
              {code}
            </span>
            {(["N", "S", "E", "W"] as const).map((s) => {
              const active = sectors.includes(`${code}-${s}`);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggleSector(`${code}-${s}`)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-pill font-mono text-[10px] font-bold",
                    active
                      ? "bg-gradient-accent text-accent-text"
                      : "bg-surface-2 text-text-muted hover:text-text",
                  )}
                  aria-pressed={active}
                  aria-label={`${code} sector ${s}`}
                >
                  {s}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onToggleProvince(code as ProvinceCode)}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-pill border border-border-subtle bg-surface-1 text-xs text-text-muted hover:bg-danger hover:text-white"
              aria-label={`Deselect ${code}`}
              title="Deselect"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
