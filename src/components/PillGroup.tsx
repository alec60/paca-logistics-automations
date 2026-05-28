import { cn } from "../lib/utils";

export interface PillOption<V extends string> {
  value: V;
  label: string;
}

export interface PillGroupProps<V extends string> {
  options: PillOption<V>[];
  value: V[] | V | null;
  onChange: (next: V[] | V) => void;
  multi?: boolean;
  ariaLabel?: string;
}

export function PillGroup<V extends string>({
  options,
  value,
  onChange,
  multi = false,
  ariaLabel,
}: PillGroupProps<V>) {
  const selected: Set<string> = new Set(
    Array.isArray(value) ? value : value ? [value] : [],
  );

  function toggle(v: V) {
    if (multi) {
      const arr = Array.isArray(value) ? [...value] : [];
      const idx = arr.indexOf(v);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(v);
      onChange(arr as V[]);
    } else {
      onChange(v);
    }
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={selected.has(o.value)}
          onClick={() => toggle(o.value)}
          className={cn(
            "rounded-pill px-4 py-1.5 text-xs font-medium",
            selected.has(o.value)
              ? "bg-gradient-accent text-accent-text shadow-glow"
              : "bg-input-bg text-input-text hover:bg-input-bg-hover",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
