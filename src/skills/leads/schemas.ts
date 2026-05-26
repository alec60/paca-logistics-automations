import { z } from "zod";
import { PROVINCES, TRUCK_TYPES, FLEET_SIZES, LEAD_COUNTS } from "./data";

const provinceCodes = PROVINCES.map((p) => p.code) as unknown as readonly [string, ...string[]];
const fleetValues = FLEET_SIZES.map((f) => f.value) as unknown as readonly [string, ...string[]];
const leadCounts = LEAD_COUNTS as unknown as readonly [number, ...number[]];

export const LeadsParams = z.object({
  truck_types: z.array(z.enum(TRUCK_TYPES)).min(1, "Pick at least one truck type"),
  fleet_size: z.enum(fleetValues),
  count: z
    .number()
    .int()
    .refine((n) => (leadCounts as readonly number[]).includes(n), {
      message: "Invalid lead count",
    }),
  provinces: z.array(z.enum(provinceCodes)).default([]),
  // PROV-X format, e.g. QC-N. Soft filter.
  sectors: z.array(z.string().regex(/^[A-Z]{2}-[NSEW]$/)).default([]),
  cities: z.array(z.string()).default([]),
  lanes: z.array(z.string().regex(/^[A-Z]{2}→[A-Z]{2}$/)).default([]),
});
export type LeadsParams = z.infer<typeof LeadsParams>;

export const Carrier = z.object({
  company: z.string().min(1),
  province: z.string().min(1),
  city: z.string().optional(),
  fleet_size: z.string().optional(),
  equipment: z.array(z.string()).default([]),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  lanes: z.string().optional(),
});
export type Carrier = z.infer<typeof Carrier>;

export const LeadsResult = z.object({
  query_summary: z.string(),
  carriers: z.array(Carrier),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
      }),
    )
    .default([]),
  cost_estimate_usd: z.number().optional(),
  blacklisted_count: z.number().default(0),
});
export type LeadsResult = z.infer<typeof LeadsResult>;
