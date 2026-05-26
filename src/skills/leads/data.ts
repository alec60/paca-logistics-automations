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

export const REGIONS = {
  maritimes: ["NB", "NS", "PE", "NL"],
  prairies: ["AB", "SK", "MB"],
  western: ["BC", "AB"],
  central: ["ON", "QC"],
  territories: ["YT", "NT", "NU"],
  all: PROVINCES.map((p) => p.code),
} as const;

export const SECTORS = ["N", "S", "E", "W"] as const;
export type Sector = (typeof SECTORS)[number];

export const CITIES = [
  "Toronto", "Montréal", "Vancouver", "Calgary", "Edmonton", "Ottawa",
  "Mississauga", "Winnipeg", "Québec City", "Hamilton", "Brampton", "Surrey",
  "Kitchener", "Laval", "Halifax", "London", "Markham", "Vaughan", "Gatineau",
  "Saskatoon", "Longueuil", "Burnaby", "Regina", "Richmond", "Oakville",
  "Burlington", "Sherbrooke", "Oshawa", "Windsor", "Saint John", "Moncton",
  "Fredericton", "St. John's", "Charlottetown", "Whitehorse", "Yellowknife",
  "Iqaluit",
] as const;
export type City = (typeof CITIES)[number];

// Build all 156 province→province permutations.
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

export const LANE_PRESETS = [
  "QC→ON", "ON→QC", "QC→NB", "NB→QC", "QC→NS", "NS→QC",
  "AB→BC", "BC→AB", "SK→MB", "MB→SK", "ON→AB", "NB→NS",
  "NS→NB", "ON→BC", "BC→ON", "AB→ON", "QC→NL", "NS→NL",
] as const;

export function isLanePreset(lane: string): boolean {
  return (LANE_PRESETS as readonly string[]).includes(lane);
}
