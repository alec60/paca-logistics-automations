// Static reference data for the shippers (customer lead finder) skill.
// A freight broker matches shippers (companies with freight) to carriers, so
// the Canadian geography is shared with the leads skill (single source of
// truth) and the freight-equipment vocabulary is intentionally the SAME as the
// carrier finder's truck types — a found shipper can then be matched against
// found carriers. All public information. No real company data per Section 11.

// Shared Canadian geography — re-export from the carrier finder so there is one
// authoritative province/city list across both automations.
export { PROVINCES } from "../leads/data";
export type { ProvinceCode } from "../leads/data";

// Equipment the shipper's freight needs — same vocabulary as the carrier
// finder's TRUCK_TYPES so the two automations line up for matching.
export { TRUCK_TYPES as FREIGHT_EQUIPMENT } from "../leads/data";
export type { TruckType as FreightEquipment } from "../leads/data";

// How many prospects to return per run. Mirrors the leads counts.
export { LEAD_COUNTS as SHIPPER_COUNTS } from "../leads/data";

// Industry verticals that generate truckable freight — the kinds of businesses
// a freight brokerage wants as customers.
export const INDUSTRIES = [
  "Manufacturing",
  "Food & Beverage",
  "Agriculture & Produce",
  "Building Materials",
  "Retail & Wholesale Distribution",
  "Automotive & Parts",
  "Forestry & Lumber",
  "Metals & Steel",
  "Chemicals & Plastics",
  "Machinery & Equipment",
  "Paper & Packaging",
  "Furniture & Appliances",
  "Mining & Aggregates",
  "Consumer Goods (CPG)",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

// Approximate shipping volume / frequency — qualifies how attractive the
// prospect is and what kind of capacity they need. "any" is the no-filter case.
export const VOLUME_LEVELS = [
  { value: "any", labelEn: "Any volume", labelFr: "Tout volume" },
  { value: "occasional", labelEn: "Occasional (LTL / spot)", labelFr: "Occasionnel (LTL / spot)" },
  { value: "regular", labelEn: "Regular (weekly FTL)", labelFr: "Régulier (FTL hebdo)" },
  {
    value: "high",
    labelEn: "High volume (daily / multi-truck)",
    labelFr: "Gros volume (quotidien / multi-camions)",
  },
] as const;
export type VolumeLevel = (typeof VOLUME_LEVELS)[number]["value"];
