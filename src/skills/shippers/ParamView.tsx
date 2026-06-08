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
  INDUSTRIES,
  FREIGHT_EQUIPMENT,
  VOLUME_LEVELS,
  SHIPPER_COUNTS,
  type ProvinceCode,
} from "./data";
import type { ShippersParams } from "./schemas";

interface Props {
  onSubmit: (params: ShippersParams) => void;
  defaultValues?: Partial<ShippersParams>;
}

export function ParamView({ onSubmit, defaultValues }: Props) {
  const fr = useSettingsStore((s) => s.locale) === "fr";

  const [industries, setIndustries] = useState<string[]>(
    defaultValues?.industries ?? ["Manufacturing"],
  );
  const [equipment, setEquipment] = useState<string[]>(defaultValues?.freight_equipment ?? []);
  const [volume, setVolume] = useState<string>(defaultValues?.volume ?? "any");
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
        // Also drop any sectors belonging to this province.
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
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function toggleLane(l: string) {
    setLanes((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function submit() {
    onSubmit({
      industries: industries as ShippersParams["industries"],
      freight_equipment: equipment as ShippersParams["freight_equipment"],
      volume: volume as ShippersParams["volume"],
      count,
      provinces: provinces as ShippersParams["provinces"],
      sectors,
      cities,
      lanes,
      custom_instructions: customInstructions.trim() || undefined,
    });
  }

  return (
    <form
      // The button below is type="button" + onClick rather than a native
      // submit. In the Tauri WebView (WebView2) a native form submit triggers a
      // webview navigation/reload instead of being handled by React, which
      // silently resets the page. onClick avoids the submit event entirely.
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-4xl flex-col gap-7 p-8"
    >
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {fr ? "Recherche d'expéditeurs" : "Shipper lead finder"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {fr
            ? "Trouvez les entreprises qui ont du fret à expédier."
            : "Find the businesses that have freight to move."}
        </p>
      </header>

      <Field label={fr ? "Secteurs d'activité" : "Industries"}>
        <PillGroup
          multi
          options={INDUSTRIES.map((t) => ({ value: t, label: t }))}
          value={industries}
          onChange={(v) => setIndustries(v as string[])}
          ariaLabel="Industries"
        />
      </Field>

      <Field label={fr ? "Besoins en équipement (optionnel)" : "Freight equipment (optional)"}>
        <PillGroup
          multi
          options={FREIGHT_EQUIPMENT.map((t) => ({ value: t, label: t }))}
          value={equipment}
          onChange={(v) => setEquipment(v as string[])}
          ariaLabel="Freight equipment"
        />
        <span className="text-[10px] text-text-dim">
          {fr
            ? "Même vocabulaire que la recherche de transporteurs — pour apparier expéditeurs et camions."
            : "Same vocabulary as the carrier finder — so shippers and trucks line up."}
        </span>
      </Field>

      <Field label={fr ? "Volume d'expédition" : "Shipping volume"}>
        <PillGroup
          options={VOLUME_LEVELS.map((v) => ({ value: v.value, label: fr ? v.labelFr : v.labelEn }))}
          value={volume}
          onChange={(v) => setVolume(v as string)}
          ariaLabel="Shipping volume"
        />
      </Field>

      <Field label={fr ? "Nombre de prospects" : "Number of prospects"}>
        <PillGroup
          options={SHIPPER_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
          value={String(count)}
          onChange={(v) => setCount(Number(v))}
          ariaLabel="Number of prospects"
        />
      </Field>

      <Field label={fr ? "Provinces et territoires" : "Provinces & territories"}>
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

      <Field label={fr ? "Villes" : "Cities"}>
        <CitySearch
          selectedCities={cities}
          selectedProvinces={provinces}
          onToggleCity={toggleCity}
        />
      </Field>

      <Field label={fr ? "Trajets typiques" : "Typical lanes"}>
        <LanePicker selectedLanes={lanes} onToggleLane={toggleLane} />
      </Field>

      <Field
        label={fr ? "Instructions personnalisées (optionnel)" : "Custom instructions (optional)"}
      >
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={
            fr
              ? "Ex. : cibler les usines en expansion, éviter les grandes entreprises déjà sous contrat…"
              : "e.g. target expanding factories, avoid large enterprises already under contract…"
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
          {fr ? "Lancer la recherche" : "Run search"}
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
