// Typed accessors over the generated GeoNames places dataset.
import type { ProvinceCode } from "./data";
import RAW from "./cities.data";

export interface Place {
  name: string;
  province: ProvinceCode;
  lat: number;
  lng: number;
  pop: number;
}

export const PLACES: Place[] = RAW.map(([name, province, lat, lng, pop]) => ({
  name,
  province: province as ProvinceCode,
  lat,
  lng,
  pop,
}));

// name -> province. Duplicate names exist across provinces (e.g. a tiny
// "Toronto, PE" alongside Toronto, ON); the highest-population instance wins so
// the badge shows the place people mean.
export const CITY_TO_PROVINCE: Record<string, ProvinceCode> = (() => {
  const bestPop: Record<string, number> = {};
  const out: Record<string, ProvinceCode> = {};
  for (const p of PLACES) {
    if (!(p.name in bestPop) || p.pop > bestPop[p.name]) {
      bestPop[p.name] = p.pop;
      out[p.name] = p.province;
    }
  }
  return out;
})();

// Unique, alphabetically-sorted city names for the type-ahead search.
export const CITIES: string[] = Object.keys(CITY_TO_PROVINCE).sort((a, b) =>
  a.localeCompare(b, "en"),
);

// A place is identified by name + province (unique in PLACES). Selections are
// stored as these keys, NOT bare names — otherwise selecting one "Mount
// Pleasant" would light up every same-named town across the country.
export const cityKey = (name: string, province: string): string => `${name}|${province}`;

export function parseCityKey(key: string): { name: string; province: string } {
  const i = key.lastIndexOf("|");
  return i < 0
    ? { name: key, province: "" }
    : { name: key.slice(0, i), province: key.slice(i + 1) };
}
