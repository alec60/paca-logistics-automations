import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../core/settings-store";
import { Button } from "../../components/ui/button";
import { PillGroup } from "../../components/PillGroup";
import { CanadaMap } from "../../components/CanadaMap";
import { RegionPicker } from "../../components/RegionPicker";
import { CitySearch } from "../../components/CitySearch";
import { LanePicker } from "../../components/LanePicker";
import {
  TRUCK_TYPES,
  FLEET_SIZES,
  LEAD_COUNTS,
  type ProvinceCode,
} from "./data";
import type { LeadsParams } from "./schemas";

interface Props {
  onSubmit: (params: LeadsParams) => void;
  defaultValues?: Partial<LeadsParams>;
}

export function ParamView({ onSubmit, defaultValues }: Props) {
  const { t: _t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);

  const [truckTypes, setTruckTypes] = useState<string[]>(
    defaultValues?.truck_types ?? ["Flatbed"],
  );
  const [fleetSize, setFleetSize] = useState<string>(defaultValues?.fleet_size ?? "any");
  const [count, setCount] = useState<number>(defaultValues?.count ?? 10);
  const [provinces, setProvinces] = useState<string[]>(defaultValues?.provinces ?? []);
  const [sectors, setSectors] = useState<string[]>(defaultValues?.sectors ?? []);
  const [cities, setCities] = useState<string[]>(defaultValues?.cities ?? []);
  const [lanes, setLanes] = useState<string[]>(defaultValues?.lanes ?? []);

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
      fleet_size: fleetSize as LeadsParams["fleet_size"],
      count,
      provinces: provinces as LeadsParams["provinces"],
      sectors,
      cities,
      lanes,
    });
  }

  const fleetOptions = FLEET_SIZES.map((f) => ({
    value: f.value,
    label: locale === "fr" ? f.labelFr : f.labelEn,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-4xl flex-col gap-7 p-8"
    >
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
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

      <Field label={locale === "fr" ? "Taille de la flotte" : "Fleet size"}>
        <PillGroup
          options={fleetOptions}
          value={fleetSize}
          onChange={(v) => setFleetSize(v as string)}
          ariaLabel="Fleet size"
        />
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

      <div className="flex justify-end">
        <Button type="submit" size="lg">
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
