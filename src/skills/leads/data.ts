// Static reference data for the leads skill.
// All public information (Canadian geography, industry-standard equipment).
// No real carrier names or business data per Section 11.

// Trimmed to the four equipment types the brokerage actually books.
// Shippers re-exports this as FREIGHT_EQUIPMENT so the two automations align.
export const TRUCK_TYPES = [
  "Flatbed",
  "B-Train",
  "Dry Van",
  "Tanker",
] as const;
export type TruckType = (typeof TRUCK_TYPES)[number];

// Maximum fleet size (number of trucks). The UI slider, the Zod schema, the
// prompt, and the handler all clamp/enforce this range — a redundant hard cap
// the model is not allowed to exceed.
export const FLEET_CAP = { min: 5, max: 200, default: 50 } as const;

// Legacy fixed steps — still used by the shippers skill (SHIPPER_COUNTS).
export const LEAD_COUNTS = [5, 10, 15, 20, 30, 50] as const;
export type LeadCount = (typeof LEAD_COUNTS)[number];

// Leads now uses a continuous slider instead of fixed steps.
export const LEAD_RANGE = { min: 5, max: 100, default: 10 } as const;

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

export const REGIONS = {
  maritimes: { codes: ["NB", "NS", "PE", "NL"], labelEn: "Maritimes", labelFr: "Maritimes" },
  prairies: { codes: ["AB", "SK", "MB"], labelEn: "Prairies", labelFr: "Prairies" },
  western: { codes: ["BC", "AB"], labelEn: "Western", labelFr: "Ouest" },
  central: { codes: ["ON", "QC"], labelEn: "Central", labelFr: "Centre" },
  territories: { codes: ["YT", "NT", "NU"], labelEn: "Territories", labelFr: "Territoires" },
  all: { codes: PROVINCES.map((p) => p.code), labelEn: "All Canada", labelFr: "Tout le Canada" },
} as const;
export type RegionKey = keyof typeof REGIONS;

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

// Comprehensive Canadian place names. Aim: every city / town big enough to
// matter for trucking. Entries are unique across the whole list — if a name
// exists in two provinces (e.g. London ON vs the rare London KY), we pick
// the Canadian-trucking-relevant one.
// Order has no functional meaning — entries display alphabetically.
export const CITY_TO_PROVINCE: Record<string, ProvinceCode> = {
  // Ontario
  "Toronto": "ON",
  "Ottawa": "ON",
  "Mississauga": "ON",
  "Brampton": "ON",
  "Hamilton": "ON",
  "London": "ON",
  "Markham": "ON",
  "Vaughan": "ON",
  "Kitchener": "ON",
  "Windsor": "ON",
  "Richmond Hill": "ON",
  "Oakville": "ON",
  "Burlington": "ON",
  "Greater Sudbury": "ON",
  "Sudbury": "ON",
  "Oshawa": "ON",
  "Barrie": "ON",
  "St. Catharines": "ON",
  "Cambridge": "ON",
  "Kingston": "ON",
  "Whitby": "ON",
  "Guelph": "ON",
  "Ajax": "ON",
  "Thunder Bay": "ON",
  "Waterloo": "ON",
  "Chatham-Kent": "ON",
  "Brantford": "ON",
  "Pickering": "ON",
  "Niagara Falls": "ON",
  "Newmarket": "ON",
  "Peterborough": "ON",
  "Sault Ste. Marie": "ON",
  "Sarnia": "ON",
  "Caledon": "ON",
  "Halton Hills": "ON",
  "Welland": "ON",
  "North Bay": "ON",
  "Belleville": "ON",
  "Cornwall": "ON",
  "Brockville": "ON",
  "Owen Sound": "ON",
  "Timmins": "ON",
  "Orillia": "ON",
  "Kenora": "ON",
  "Woodstock": "ON",
  "Quinte West": "ON",
  "Innisfil": "ON",
  "Georgina": "ON",
  "Milton": "ON",
  "St. Thomas": "ON",
  "Tillsonburg": "ON",
  "Fort Erie": "ON",
  "Cobourg": "ON",
  "Port Colborne": "ON",
  "Leamington": "ON",
  "Orangeville": "ON",
  "Wasaga Beach": "ON",
  "Pembroke": "ON",
  "Collingwood": "ON",
  "New Tecumseth": "ON",
  "Midland": "ON",
  "Petawawa": "ON",
  "Hawkesbury": "ON",
  "Elliot Lake": "ON",
  "Smiths Falls": "ON",
  "Espanola": "ON",
  "Renfrew": "ON",
  "Aurora": "ON",
  "Stratford": "ON",

  // Quebec
  "Montréal": "QC",
  "Québec City": "QC",
  "Laval": "QC",
  "Gatineau": "QC",
  "Longueuil": "QC",
  "Sherbrooke": "QC",
  "Saguenay": "QC",
  "Lévis": "QC",
  "Trois-Rivières": "QC",
  "Terrebonne": "QC",
  "Saint-Jean-sur-Richelieu": "QC",
  "Repentigny": "QC",
  "Brossard": "QC",
  "Drummondville": "QC",
  "Saint-Jérôme": "QC",
  "Granby": "QC",
  "Blainville": "QC",
  "Saint-Hyacinthe": "QC",
  "Shawinigan": "QC",
  "Dollard-des-Ormeaux": "QC",
  "Rimouski": "QC",
  "Châteauguay": "QC",
  "Saint-Eustache": "QC",
  "Saint-Bruno-de-Montarville": "QC",
  "Victoriaville": "QC",
  "Rouyn-Noranda": "QC",
  "Salaberry-de-Valleyfield": "QC",
  "Sorel-Tracy": "QC",
  "Joliette": "QC",
  "Boucherville": "QC",
  "Mirabel": "QC",
  "Mascouche": "QC",
  "Alma": "QC",
  "Saint-Georges": "QC",
  "Sept-Îles": "QC",
  "Thetford Mines": "QC",
  "Val-d'Or": "QC",
  "Magog": "QC",
  "Mont-Saint-Hilaire": "QC",
  "La Prairie": "QC",
  "Saint-Constant": "QC",
  "Vaudreuil-Dorion": "QC",
  "Saint-Sauveur": "QC",
  "Boisbriand": "QC",

  // British Columbia
  "Vancouver": "BC",
  "Surrey": "BC",
  "Burnaby": "BC",
  "Richmond": "BC",
  "Abbotsford": "BC",
  "Coquitlam": "BC",
  "Langley": "BC",
  "Saanich": "BC",
  "Delta": "BC",
  "Kelowna": "BC",
  "Victoria": "BC",
  "Kamloops": "BC",
  "Nanaimo": "BC",
  "Chilliwack": "BC",
  "Maple Ridge": "BC",
  "New Westminster": "BC",
  "Prince George": "BC",
  "North Vancouver": "BC",
  "West Vancouver": "BC",
  "Port Coquitlam": "BC",
  "Port Moody": "BC",
  "Mission": "BC",
  "Vernon": "BC",
  "Penticton": "BC",
  "Campbell River": "BC",
  "Fort St. John": "BC",
  "Courtenay": "BC",
  "White Rock": "BC",
  "Cranbrook": "BC",
  "Squamish": "BC",
  "Powell River": "BC",
  "Pitt Meadows": "BC",
  "Parksville": "BC",
  "Salmon Arm": "BC",
  "Prince Rupert": "BC",
  "Dawson Creek": "BC",
  "Terrace": "BC",
  "Quesnel": "BC",
  "Williams Lake": "BC",
  "Nelson": "BC",
  "Castlegar": "BC",
  "Trail": "BC",
  "Comox": "BC",
  "Duncan": "BC",
  "Sechelt": "BC",
  "Revelstoke": "BC",
  "Whistler": "BC",

  // Alberta
  "Calgary": "AB",
  "Edmonton": "AB",
  "Red Deer": "AB",
  "Lethbridge": "AB",
  "St. Albert": "AB",
  "Medicine Hat": "AB",
  "Grande Prairie": "AB",
  "Airdrie": "AB",
  "Spruce Grove": "AB",
  "Leduc": "AB",
  "Fort Saskatchewan": "AB",
  "Okotoks": "AB",
  "Camrose": "AB",
  "Cold Lake": "AB",
  "Wetaskiwin": "AB",
  "Brooks": "AB",
  "Sylvan Lake": "AB",
  "High River": "AB",
  "Cochrane": "AB",
  "Canmore": "AB",
  "Fort McMurray": "AB",
  "Beaumont": "AB",
  "Stony Plain": "AB",
  "Strathmore": "AB",
  "Drayton Valley": "AB",
  "Whitecourt": "AB",
  "Slave Lake": "AB",
  "Hinton": "AB",
  "Edson": "AB",
  "Olds": "AB",
  "Innisfail": "AB",

  // Manitoba
  "Winnipeg": "MB",
  "Brandon": "MB",
  "Steinbach": "MB",
  "Winkler": "MB",
  "Portage la Prairie": "MB",
  "Selkirk": "MB",
  "Morden": "MB",
  "Dauphin": "MB",
  "Thompson": "MB",
  "The Pas": "MB",
  "Flin Flon": "MB",
  "Stonewall": "MB",
  "Niverville": "MB",
  "Altona": "MB",
  "Beausejour": "MB",
  "Carman": "MB",
  "Neepawa": "MB",
  "Swan River": "MB",

  // Saskatchewan
  "Saskatoon": "SK",
  "Regina": "SK",
  "Prince Albert": "SK",
  "Moose Jaw": "SK",
  "Swift Current": "SK",
  "Yorkton": "SK",
  "North Battleford": "SK",
  "Estevan": "SK",
  "Lloydminster": "SK",
  "Warman": "SK",
  "Martensville": "SK",
  "Weyburn": "SK",
  "Melfort": "SK",
  "Humboldt": "SK",
  "Meadow Lake": "SK",
  "Nipawin": "SK",
  "Rosthern": "SK",

  // New Brunswick
  "Saint John": "NB",
  "Moncton": "NB",
  "Fredericton": "NB",
  "Dieppe": "NB",
  "Riverview": "NB",
  "Miramichi": "NB",
  "Edmundston": "NB",
  "Bathurst": "NB",
  "Campbellton": "NB",
  "Oromocto": "NB",
  "Quispamsis": "NB",
  "Rothesay": "NB",
  "Grand Falls": "NB",
  "Sussex": "NB",
  "Sackville": "NB",
  "Shediac": "NB",
  "Tracadie": "NB",

  // Nova Scotia
  "Halifax": "NS",
  "Cape Breton": "NS",
  "Sydney": "NS",
  "Truro": "NS",
  "Dartmouth": "NS",
  "New Glasgow": "NS",
  "Glace Bay": "NS",
  "Yarmouth": "NS",
  "Amherst": "NS",
  "Kentville": "NS",
  "Bridgewater": "NS",
  "Sydney Mines": "NS",
  "Antigonish": "NS",
  "Pictou": "NS",
  "Liverpool": "NS",
  "Lunenburg": "NS",

  // Newfoundland & Labrador
  "St. John's": "NL",
  "Conception Bay South": "NL",
  "Mount Pearl": "NL",
  "Corner Brook": "NL",
  "Paradise": "NL",
  "Grand Falls-Windsor": "NL",
  "Gander": "NL",
  "Happy Valley-Goose Bay": "NL",
  "Labrador City": "NL",
  "Stephenville": "NL",
  "Marystown": "NL",
  "Channel-Port aux Basques": "NL",
  "Clarenville": "NL",

  // Prince Edward Island
  "Charlottetown": "PE",
  "Summerside": "PE",
  "Montague": "PE",
  "Souris": "PE",
  "Kensington": "PE",

  // Yukon
  "Whitehorse": "YT",
  "Dawson City": "YT",
  "Watson Lake": "YT",
  "Haines Junction": "YT",
  "Carmacks": "YT",
  "Mayo": "YT",

  // Northwest Territories
  "Yellowknife": "NT",
  "Hay River": "NT",
  "Inuvik": "NT",
  "Fort Smith": "NT",
  "Behchoko": "NT",
  "Norman Wells": "NT",
  "Fort Simpson": "NT",

  // Nunavut
  "Iqaluit": "NU",
  "Rankin Inlet": "NU",
  "Arviat": "NU",
  "Cambridge Bay": "NU",
  "Baker Lake": "NU",
  "Igloolik": "NU",
  "Pangnirtung": "NU",
  "Pond Inlet": "NU",
  "Kugluktuk": "NU",
};

export const CITIES = Object.keys(CITY_TO_PROVINCE);
export type City = string;
