// Two-step lane builder: pick one or more origin provinces, then one or more
// destinations, then click Add. Each origin×destination combination becomes
// a lane chip. Pinned lanes show up as quick-select chips at the top.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, X, ArrowRight, Plus } from "lucide-react";
import { PROVINCES, type ProvinceCode } from "../skills/leads/data";
import { useSettingsStore } from "../core/settings-store";
import { cn } from "../lib/utils";

interface Props {
  selectedLanes: string[]; // "PROV→PROV"
  onToggleLane: (lane: string) => void;
}

export function LanePicker({ selectedLanes, onToggleLane }: Props) {
  const { t } = useTranslation();
  const pinned = useSettingsStore((s) => s.pinnedLanes);
  const togglePinned = useSettingsStore((s) => s.togglePinnedLane);

  const [origins, setOrigins] = useState<ProvinceCode[]>([]);
  const [dests, setDests] = useState<ProvinceCode[]>([]);

  function addLanes() {
    for (const a of origins) {
      for (const b of dests) {
        if (a === b) continue;
        const lane = `${a}→${b}`;
        if (!selectedLanes.includes(lane)) onToggleLane(lane);
      }
    }
    setOrigins([]);
    setDests([]);
  }

  function ProvinceList({
    title,
    selected,
    onChange,
  }: {
    title: string;
    selected: ProvinceCode[];
    onChange: (next: ProvinceCode[]) => void;
  }) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <div className="text-xs font-medium uppercase tracking-wider text-text-dim">
          {title}
        </div>
        <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-lg bg-surface-1 p-2 sm:grid-cols-3">
          {PROVINCES.map((p) => {
            const isOn = selected.includes(p.code);
            return (
              <button
                key={p.code}
                type="button"
                onClick={() =>
                  onChange(
                    isOn
                      ? selected.filter((x) => x !== p.code)
                      : [...selected, p.code],
                  )
                }
                aria-pressed={isOn}
                className={cn(
                  "rounded-md px-2 py-1.5 text-center text-xs font-semibold tracking-wider",
                  isOn
                    ? "bg-gradient-accent text-accent-text shadow-glow"
                    : "bg-input-bg text-input-text hover:bg-input-bg-hover",
                )}
              >
                {p.code}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Pinned quick-selects */}
      {pinned.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-text-dim">
            {t("leads.pinned", { defaultValue: "Pinned" })}
          </span>
          {pinned.map((lane) => {
            const isOn = selectedLanes.includes(lane);
            return (
              <button
                key={lane}
                type="button"
                onClick={() => onToggleLane(lane)}
                className={cn(
                  "rounded-pill px-3 py-1 text-xs font-medium",
                  isOn
                    ? "bg-gradient-accent text-accent-text"
                    : "border border-border-subtle bg-surface-2 text-text-muted hover:text-text",
                )}
              >
                {lane}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected lane chips */}
      {selectedLanes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedLanes.map((lane) => {
            const isPinned = pinned.includes(lane);
            return (
              <span
                key={lane}
                className="inline-flex items-center gap-1 rounded-pill bg-gradient-accent px-3 py-1 text-xs font-medium text-accent-text"
              >
                {lane}
                <button
                  type="button"
                  onClick={() => togglePinned(lane)}
                  aria-label={isPinned ? `Unpin ${lane}` : `Pin ${lane}`}
                  title={isPinned ? "Unpin" : "Pin"}
                  className="opacity-80 hover:opacity-100"
                >
                  {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLane(lane)}
                  aria-label={`Remove ${lane}`}
                  className="opacity-80 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* 2-step builder */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
        <ProvinceList
          title={t("leads.lane_from", { defaultValue: "From" })}
          selected={origins}
          onChange={setOrigins}
        />
        <ArrowRight className="hidden h-5 w-5 self-center text-text-dim sm:block" />
        <ProvinceList
          title={t("leads.lane_to", { defaultValue: "To" })}
          selected={dests}
          onChange={setDests}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={addLanes}
          disabled={origins.length === 0 || dests.length === 0}
          className={cn(
            "inline-flex items-center gap-1 rounded-pill px-4 py-2 text-xs font-medium",
            origins.length === 0 || dests.length === 0
              ? "bg-surface-2 text-text-dim"
              : "bg-gradient-accent text-accent-text shadow-glow hover:brightness-110",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("leads.lane_add", {
            n: Math.max(0, origins.length * dests.length - origins.filter((o) => dests.includes(o)).length),
            defaultValue: "Add {{n}} lane(s)",
          })}
        </button>
      </div>
    </div>
  );
}
