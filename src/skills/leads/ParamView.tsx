import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../core/settings-store";
import { Button } from "../../components/ui/button";
import { PillGroup } from "../../components/PillGroup";
import { ChipInput } from "../../components/ChipInput";
import {
  TRUCK_TYPES,
  FLEET_SIZES,
  LEAD_COUNTS,
  PROVINCES,
  REGIONS,
  CITIES,
  LANE_PRESETS,
  buildAllLanes,
  isLanePreset,
  SECTORS,
} from "./data";
import type { LeadsParams } from "./schemas";

const ALL_LANES = buildAllLanes();

interface Props {
  onSubmit: (params: LeadsParams) => void;
  defaultValues?: Partial<LeadsParams>;
}

export function ParamView({ onSubmit, defaultValues }: Props) {
  const { t } = useTranslation();
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

  function applyRegion(key: keyof typeof REGIONS) {
    setProvinces([...REGIONS[key]]);
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

  const provinceOptions = PROVINCES.map((p) => ({
    value: p.code,
    label: `${p.code} — ${locale === "fr" ? p.nameFr : p.nameEn}`,
  }));

  // Sector PillGroup only renders for selected provinces.
  const sectorOptions = provinces.flatMap((p) =>
    SECTORS.map((s) => ({ value: `${p}-${s}`, label: `${p}-${s}` })),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-4xl flex-col gap-6 p-8"
    >
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {locale === "fr" ? "Recherche de transporteurs" : "Carrier lead finder"}
        </h1>
      </header>

      <Field label={t("settings.title")} hint={null}>
        <fieldset className="flex flex-col gap-4">
          <Field label={locale === "fr" ? "Types de camion" : "Truck types"} hint="multi">
            <PillGroup
              multi
              options={TRUCK_TYPES.map((t) => ({ value: t, label: t }))}
              value={truckTypes}
              onChange={(v) => setTruckTypes(v as string[])}
              ariaLabel="Truck types"
            />
          </Field>

          <Field label={locale === "fr" ? "Taille de la flotte" : "Fleet size"} hint="single">
            <PillGroup
              options={fleetOptions}
              value={fleetSize}
              onChange={(v) => setFleetSize(v as string)}
              ariaLabel="Fleet size"
            />
          </Field>

          <Field label={locale === "fr" ? "Nombre de pistes" : "Number of leads"} hint="single">
            <PillGroup
              options={LEAD_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(count)}
              onChange={(v) => setCount(Number(v))}
              ariaLabel="Number of leads"
            />
          </Field>

          <Field label={locale === "fr" ? "Provinces et territoires" : "Provinces & territories"} hint="multi + regions">
            <div className="flex flex-wrap gap-1.5">
              {(["maritimes", "prairies", "western", "central", "territories", "all"] as const).map((r) => (
                <Button key={r} type="button" size="sm" variant="outline" onClick={() => applyRegion(r)}>
                  {r}
                </Button>
              ))}
            </div>
            <PillGroup
              multi
              options={provinceOptions}
              value={provinces}
              onChange={(v) => setProvinces(v as string[])}
              ariaLabel="Provinces"
            />
          </Field>

          {provinces.length > 0 && (
            <Field
              label={locale === "fr" ? "Secteurs régionaux" : "Regional sectors"}
              hint={locale === "fr" ? "filtre indicatif" : "soft filter"}
            >
              <PillGroup
                multi
                options={sectorOptions}
                value={sectors}
                onChange={(v) => setSectors(v as string[])}
                ariaLabel="Sectors"
              />
            </Field>
          )}

          <Field label={locale === "fr" ? "Villes" : "Cities"} hint="multi">
            <ChipInput
              values={cities}
              onChange={setCities}
              placeholder={CITIES[0]}
              ariaLabel="Cities"
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border-subtle bg-surface-1 p-2">
              <div className="flex flex-wrap gap-1">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      cities.includes(c)
                        ? setCities(cities.filter((x) => x !== c))
                        : setCities([...cities, c])
                    }
                    className={
                      "rounded-sm px-2 py-0.5 text-xs " +
                      (cities.includes(c)
                        ? "bg-accent-bg text-accent"
                        : "bg-surface-2 text-text-muted hover:text-text")
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <Field label={locale === "fr" ? "Trajets préférés" : "Preferred lanes"} hint="multi + presets">
            <div className="flex flex-wrap gap-1.5">
              {LANE_PRESETS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => (lanes.includes(l) ? setLanes(lanes.filter((x) => x !== l)) : setLanes([...lanes, l]))}
                  className={
                    "rounded-md border px-2 py-0.5 text-xs " +
                    (lanes.includes(l)
                      ? "border-accent bg-accent-bg text-accent"
                      : "border-border-subtle bg-surface-1 text-text-muted hover:border-border hover:text-text")
                  }
                  aria-pressed={lanes.includes(l)}
                >
                  {l} <span className="text-text-dim">Preset</span>
                </button>
              ))}
            </div>
            <ChipInput
              values={lanes}
              onChange={setLanes}
              placeholder={ALL_LANES[0]}
              ariaLabel="Lanes"
            />
            <details className="mt-1 text-xs text-text-dim">
              <summary className="cursor-pointer">
                {locale === "fr" ? `Tous les trajets (${ALL_LANES.length})` : `All lanes (${ALL_LANES.length})`}
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border-subtle bg-surface-1 p-2">
                <div className="grid grid-cols-4 gap-1 font-mono">
                  {ALL_LANES.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() =>
                        lanes.includes(l) ? setLanes(lanes.filter((x) => x !== l)) : setLanes([...lanes, l])
                      }
                      className={
                        "rounded px-1 text-left text-[10px] " +
                        (lanes.includes(l)
                          ? "bg-accent-bg text-accent"
                          : "text-text-muted hover:bg-surface-2 hover:text-text")
                      }
                    >
                      {l}
                      {isLanePreset(l) && <span className="ml-1 text-text-dim">·</span>}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </Field>
        </fieldset>
      </Field>

      <div className="flex justify-end">
        <Button type="submit">
          {locale === "fr" ? "Lancer la recherche" : "Run search"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        {hint && <span className="text-xs text-text-dim">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
