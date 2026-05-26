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
            "rounded-md border px-3 py-1 text-xs",
            selected.has(o.value)
              ? "border-accent bg-accent-bg text-accent"
              : "border-border-subtle bg-surface-1 text-text-muted hover:border-border hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
