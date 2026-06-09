import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSettingsStore } from "../../core/settings-store";
import { Button } from "../../components/ui/button";
import { PillGroup } from "../../components/PillGroup";
import { LeadsMap } from "../../components/LeadsMap";
import { CitySearch } from "../../components/CitySearch";
import { LanePicker } from "../../components/LanePicker";
import { BlacklistSection } from "../../components/BlacklistSection";
import { SelectionSummary } from "../../components/SelectionSummary";
import { TRUCK_TYPES, FLEET_CAP, LEAD_RANGE, type ProvinceCode } from "./data";
import type { LeadsParams } from "./schemas";

interface Props {
  onSubmit: (params: LeadsParams) => void;
  defaultValues?: Partial<LeadsParams>;
}

export function ParamView({ onSubmit, defaultValues }: Props) {
  const fr = useSettingsStore((s) => s.locale) === "fr";

  const [truckTypes, setTruckTypes] = useState<string[]>(
    defaultValues?.truck_types ?? ["Flatbed"],
  );
  const [maxFleetSize, setMaxFleetSize] = useState<number>(
    defaultValues?.max_fleet_size ?? FLEET_CAP.default,
  );
  const [count, setCount] = useState<number>(defaultValues?.count ?? LEAD_RANGE.default);
  const [provinces, setProvinces] = useState<string[]>(defaultValues?.provinces ?? []);
  const [sectors, setSectors] = useState<string[]>(defaultValues?.sectors ?? []);
  const [cities, setCities] = useState<string[]>(defaultValues?.cities ?? []);
  const [lanes, setLanes] = useState<string[]>(defaultValues?.lanes ?? []);
  const [customInstructions, setCustomInstructions] = useState<string>(
    defaultValues?.custom_instructions ?? "",
  );

  function toggleProvince(code: ProvinceCode) {
    setProvinces((prev) => {
      if (prev.includes(code)) {
        setSectors((s) => s.filter((x) => !x.startsWith(`${code}-`)));
        return prev.filter((x) => x !== code);
      }
      return [...prev, code];
    });
  }

  function toggleCity(c: string) {
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  // Paint-select adds a whole region's towns at once (union, no duplicates).
  function addCities(names: string[]) {
    setCities((prev) => {
      const set = new Set(prev);
      for (const n of names) set.add(n);
      return [...set];
    });
  }

  function toggleLane(l: string) {
    setLanes((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function submit() {
    onSubmit({
      truck_types: truckTypes as LeadsParams["truck_types"],
      count,
      provinces: provinces as LeadsParams["provinces"],
      sectors,
      cities,
      lanes,
      max_fleet_size: maxFleetSize,
      custom_instructions: customInstructions.trim() || undefined,
    });
  }

  return (
    <form
      // type="button" + onClick below, not a native submit: in the Tauri
      // WebView2 a native form submit triggers a navigation/reload.
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex h-full min-h-0 flex-col gap-2 p-3 lg:px-5 lg:py-4"
    >
      <header className="flex shrink-0 items-baseline justify-between gap-4">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {fr ? "Recherche de transporteurs" : "Carrier lead finder"}
        </h1>
        <p className="hidden text-xs text-text-muted sm:block">
          {fr ? "Filtrez. Lancez. Récupérez les pistes." : "Filter. Run. Collect leads."}
        </p>
      </header>

      {/* Body fills the remaining height: controls on the left, map on the right.
          Everything stays on one screen — the left column scrolls internally
          only as a safety net. */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(300px,360px)_1fr]">
        {/* LEFT — controls */}
        <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">
          <Field label={fr ? "Types de camion" : "Truck types"}>
            <PillGroup
              multi
              options={TRUCK_TYPES.map((t) => ({ value: t, label: t }))}
              value={truckTypes}
              onChange={(v) => setTruckTypes(v as string[])}
              ariaLabel="Truck types"
            />
          </Field>

          <Field label={fr ? "Taille de flotte max." : "Max fleet size"}>
            <SliderRow
              value={maxFleetSize}
              min={FLEET_CAP.min}
              max={FLEET_CAP.max}
              onChange={setMaxFleetSize}
              prefix="≤"
              suffix={fr ? "camions" : "trucks"}
              ariaLabel="Maximum fleet size"
            />
          </Field>

          <Field label={fr ? "Nombre de pistes" : "Number of leads"}>
            <SliderRow
              value={count}
              min={LEAD_RANGE.min}
              max={LEAD_RANGE.max}
              onChange={setCount}
              suffix={fr ? "pistes" : "leads"}
              ariaLabel="Number of leads"
            />
          </Field>

          <SelectionSummary
            provinces={provinces}
            sectors={sectors}
            cities={cities}
            onRemoveProvince={(c) => toggleProvince(c as ProvinceCode)}
            onRemoveCity={toggleCity}
            onClear={() => {
              setProvinces([]);
              setSectors([]);
              setCities([]);
            }}
          />

          <Field label={fr ? "Villes" : "Cities"}>
            <CitySearch
              hideSelected
              selectedCities={cities}
              selectedProvinces={provinces}
              onToggleCity={toggleCity}
            />
          </Field>

          <Disclosure
            label={fr ? "Trajets préférés" : "Preferred lanes"}
            count={lanes.length}
          >
            <LanePicker selectedLanes={lanes} onToggleLane={toggleLane} />
          </Disclosure>

          <BlacklistSection />

          <Field label={fr ? "Instructions (optionnel)" : "Custom instructions (optional)"}>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={
                fr
                  ? "Ex. : privilégier les transporteurs avec hayon élévateur…"
                  : "e.g. prefer carriers with a liftgate…"
              }
              className="w-full resize-none rounded-lg border border-transparent bg-input-bg px-3 py-2 text-sm text-input-text placeholder:text-input-placeholder hover:bg-input-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            />
          </Field>
        </div>

        {/* RIGHT — interactive map fills the available height. The absolute-fill
            wrapper gives it a definite size to measure against. */}
        <div className="relative min-h-0">
          <div className="absolute inset-0">
            <LeadsMap
              selectedProvinces={provinces}
              selectedCities={cities}
              onToggleProvince={toggleProvince}
              onToggleCity={toggleCity}
              onAddCities={addCities}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <span className="text-xs text-text-dim">
          {truckTypes.length} {fr ? "type(s)" : "type(s)"} · {count} {fr ? "pistes" : "leads"}
          {provinces.length + cities.length > 0
            ? ` · ${provinces.length + cities.length} ${fr ? "lieu(x)" : "place(s)"}`
            : ""}
        </span>
        <Button type="button" size="lg" onClick={submit} disabled={truckTypes.length === 0}>
          {fr ? "Lancer la recherche" : "Run search"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function SliderRow({
  value,
  min,
  max,
  onChange,
  suffix,
  prefix,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  suffix: string;
  prefix?: string;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-input-bg accent-accent"
      />
      <span className="w-24 shrink-0 text-right font-mono text-xs text-text">
        {prefix ? `${prefix} ` : ""}
        {value} {suffix}
      </span>
    </div>
  );
}

function Disclosure({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-border-subtle bg-surface-1">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium">
        <span className="flex items-center gap-2">
          {label}
          {count != null && count > 0 && (
            <span className="rounded-pill bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-text-muted">
              {count}
            </span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}
