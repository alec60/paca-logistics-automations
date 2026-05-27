// Static reference data for the leads skill.
// All public information (Canadian geography, industry-standard equipment).
// No real carrier names or business data per Section 11.

export const TRUCK_TYPES = [
  "Flatbed",
  "Bi-Train",
  "Dry Van",
  "Reefer",
  "Tanker",
  "Lowboy",
  "Step Deck",
  "Curtainsider",
  "B-Train",
  "Conestoga",
] as const;
export type TruckType = (typeof TRUCK_TYPES)[number];

export const FLEET_SIZES = [
  { value: "small", labelEn: "Small (1–10)", labelFr: "Petite (1–10)" },
  { value: "medium", labelEn: "Medium (11–50)", labelFr: "Moyenne (11–50)" },
  { value: "large", labelEn: "Large (51–200)", labelFr: "Grande (51–200)" },
  { value: "xl", labelEn: "XL (200+)", labelFr: "XL (200+)" },
  { value: "any", labelEn: "Any", labelFr: "Toutes" },
] as const;
export type FleetSize = (typeof FLEET_SIZES)[number]["value"];

export const LEAD_COUNTS = [5, 10, 15, 20, 30, 50] as const;
export type LeadCount = (typeof LEAD_COUNTS)[number];

export const PROVINCES = [
  { code: "AB", nameEn: "Alberta", nameFr: "Alberta" },
  { code: "BC", nameEn: "British Columbia", nameFr: "Colombie-Britannique" },
  { code: "MB", nameEn: "Manitoba", nameFr: "Manitoba" },
  { code: "NB", nameEn: "New Brunswick", nameFr: "Nouveau-Brunswick" },
  { code: "NL", nameEn: "Newfoundland & Labrador", nameFr: "Terre-Neuve-et-Labrador" },
  { code: "NS", nameEn: "Nova Scotia", nameFr: "Nouvelle-Écosse" },
  { code: "NT", nameEn: "Northwest Territories", nameFr: "Territoires du Nord-Ouest" },
  { code: "NU", nameEn: "Nunavut", nameFr: "Nunavut" },
  { code: "ON", nameEn: "Ontario", nameFr: "Ontario" },
  { code: "PE", nameEn: "Prince Edward Island", nameFr: "Île-du-Prince-Édouard" },
  { code: "QC", nameEn: "Quebec", nameFr: "Québec" },
  { code: "SK", nameEn: "Saskatchewan", nameFr: "Saskatchewan" },
  { code: "YT", nameEn: "Yukon", nameFr: "Yukon" },
] as const;
export type ProvinceCode = (typeof PROVINCES)[number]["code"];

export const TERRITORY_CODES = ["YT", "NT", "NU"] as const;

export const SECTORS = ["N", "S", "E", "W"] as const;
export type Sector = (typeof SECTORS)[number];

// 13×12 = 156 lane permutations.
export function buildAllLanes(): string[] {
  const codes = PROVINCES.map((p) => p.code);
  const out: string[] = [];
  for (const a of codes) {
    for (const b of codes) {
      if (a !== b) out.push(`${a}→${b}`);
    }
  }
  return out;
}

// City → province mapping. Lets the city search filter by selected provinces.
export const CITY_TO_PROVINCE: Record<string, ProvinceCode> = {
  Toronto: "ON",
  Montréal: "QC",
  Vancouver: "BC",
  Calgary: "AB",
  Edmonton: "AB",
  Ottawa: "ON",
  Mississauga: "ON",
  Winnipeg: "MB",
  "Québec City": "QC",
  Hamilton: "ON",
  Brampton: "ON",
  Surrey: "BC",
  Kitchener: "ON",
  Laval: "QC",
  Halifax: "NS",
  London: "ON",
  Markham: "ON",
  Vaughan: "ON",
  Gatineau: "QC",
  Saskatoon: "SK",
  Longueuil: "QC",
  Burnaby: "BC",
  Regina: "SK",
  Richmond: "BC",
  Oakville: "ON",
  Burlington: "ON",
  Sherbrooke: "QC",
  Oshawa: "ON",
  Windsor: "ON",
  "Saint John": "NB",
  Moncton: "NB",
  Fredericton: "NB",
  "St. John's": "NL",
  Charlottetown: "PE",
  Whitehorse: "YT",
  Yellowknife: "NT",
  Iqaluit: "NU",
};

export const CITIES = Object.keys(CITY_TO_PROVINCE);
export type City = string;

