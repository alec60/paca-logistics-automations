import { useState } from "react";
import { useSettingsStore } from "../../core/settings-store";
import { Button } from "../../components/ui/button";
import { PillGroup } from "../../components/PillGroup";
import { CanadaMap } from "../../components/CanadaMap";
import { RegionPicker } from "../../components/RegionPicker";
import { CitySearch } from "../../components/CitySearch";
import { LanePicker } from "../../components/LanePicker";
import { BlacklistSection } from "../../components/BlacklistSection";
import {
  TRUCK_TYPES,
  LEAD_COUNTS,
  FLEET_CAP,
  type ProvinceCode,
} from "./data";
import type { LeadsParams } from "./schemas";

interface Props {
  onSubmit: (params: LeadsParams) => void;
  defaultValues?: Partial<LeadsParams>;
}

export function ParamView({ onSubmit, defaultValues }: Props) {
  const locale = useSettingsStore((s) => s.locale);

  const [truckTypes, setTruckTypes] = useState<string[]>(
    defaultValues?.truck_types ?? ["Flatbed"],
  );
  const [maxFleetSize, setMaxFleetSize] = useState<number>(
    defaultValues?.max_fleet_size ?? FLEET_CAP.default,
  );
  const [count, setCount] = useState<number>(defaultValues?.count ?? 10);
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
        // Also drop any sectors belonging to this province
        setSectors((s) => s.filter((x) => !x.startsWith(`${code}-`)));
        return prev.filter((x) => x !== code);
      }
      return [...prev, code];
    });
  }

  function toggleSector(sector: string) {
    setSectors((prev) =>
      prev.includes(sector) ? prev.filter((x) => x !== sector) : [...prev, sector],
    );
  }

  function toggleCity(c: string) {
    setCities((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function toggleLane(l: string) {
    setLanes((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );
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
      // The button below is type="button" + onClick rather than a native
      // submit. In the Tauri WebView (WebView2) a native form submit triggers
      // a webview navigation/reload instead of being handled by React, which
      // silently resets the page. onClick avoids the submit event entirely.
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-4xl flex-col gap-7 p-8"
    >
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {locale === "fr" ? "Recherche de transporteurs" : "Carrier lead finder"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {locale === "fr"
            ? "Filtrez. Lancez. Récupérez les pistes."
            : "Filter. Run. Collect leads."}
        </p>
      </header>

      <Field label={locale === "fr" ? "Types de camion" : "Truck types"}>
        <PillGroup
          multi
          options={TRUCK_TYPES.map((t) => ({ value: t, label: t }))}
          value={truckTypes}
          onChange={(v) => setTruckTypes(v as string[])}
          ariaLabel="Truck types"
        />
      </Field>

      <Field
        label={locale === "fr" ? "Taille de flotte maximale" : "Maximum fleet size"}
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={FLEET_CAP.min}
            max={FLEET_CAP.max}
            step={1}
            value={maxFleetSize}
            onChange={(e) => setMaxFleetSize(Number(e.target.value))}
            aria-label="Maximum fleet size"
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-input-bg accent-accent"
          />
          <span className="w-28 shrink-0 text-right font-mono text-sm text-text">
            ≤ {maxFleetSize} {locale === "fr" ? "camions" : "trucks"}
          </span>
        </div>
        <span className="text-[10px] text-text-dim">
          {locale === "fr"
            ? "Plafond strict (5–200) — aucun transporteur plus grand ne sera retourné."
            : "Hard cap (5–200) — no larger carrier will be returned."}
        </span>
      </Field>

      <Field label={locale === "fr" ? "Nombre de pistes" : "Number of leads"}>
        <PillGroup
          options={LEAD_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
          value={String(count)}
          onChange={(v) => setCount(Number(v))}
          ariaLabel="Number of leads"
        />
      </Field>

      <Field
        label={locale === "fr" ? "Provinces et territoires" : "Provinces & territories"}
      >
        <div className="flex flex-col gap-3">
          <RegionPicker
            selectedProvinces={provinces}
            onSet={(codes) => {
              setProvinces(codes);
              // Drop sectors for any province no longer selected.
              setSectors((s) => s.filter((x) => codes.some((c) => x.startsWith(`${c}-`))));
            }}
          />
          <CanadaMap
            selectedProvinces={provinces}
            sectors={sectors}
            onToggleProvince={toggleProvince}
            onToggleSector={toggleSector}
          />
        </div>
      </Field>

      <Field label={locale === "fr" ? "Villes" : "Cities"}>
        <CitySearch
          selectedCities={cities}
          selectedProvinces={provinces}
          onToggleCity={toggleCity}
        />
      </Field>

      <Field label={locale === "fr" ? "Trajets préférés" : "Preferred lanes"}>
        <LanePicker selectedLanes={lanes} onToggleLane={toggleLane} />
      </Field>

      <Field
        label={
          locale === "fr"
            ? "Instructions personnalisées (optionnel)"
            : "Custom instructions (optional)"
        }
      >
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={
            locale === "fr"
              ? "Ex. : privilégier les transporteurs avec hayon élévateur, éviter les très grandes flottes…"
              : "e.g. prefer carriers with a liftgate, avoid very large fleets…"
          }
          className="w-full resize-y rounded-lg border border-transparent bg-input-bg px-4 py-2.5 text-sm text-input-text placeholder:text-input-placeholder hover:bg-input-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        />
        <span className="text-right text-[10px] text-text-dim">
          {customInstructions.length}/500
        </span>
      </Field>

      <BlacklistSection />

      <div className="flex justify-end">
        <Button type="button" size="lg" onClick={submit}>
          {locale === "fr" ? "Lancer la recherche" : "Run search"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
