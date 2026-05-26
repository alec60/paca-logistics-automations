// Multi-select chip input. Phase 3 wires this up to the leads skill ParamView.
// Phase 1 ships a typed stub so imports type-check.
import { useState } from "react";

export interface ChipInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function ChipInput({ values, onChange, placeholder, ariaLabel }: ChipInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded border border-border-subtle bg-surface-1 px-2 py-1.5"
      aria-label={ariaLabel}
    >
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-sm bg-surface-3 px-2 py-0.5 text-xs"
        >
          {v}
          <button
            type="button"
            onClick={() => remove(v)}
            className="text-text-dim hover:text-text"
            aria-label={`Remove ${v}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="flex-1 min-w-[8ch] bg-transparent text-sm outline-none placeholder:text-text-dim"
      />
    </div>
  );
}
