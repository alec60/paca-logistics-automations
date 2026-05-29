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
  // Optional free-text steer added to the prompt. Capped to keep token cost
  // predictable and bounded at the system boundary.
  custom_instructions: z.string().max(500).optional(),
});
export type LeadsParams = z.infer<typeof LeadsParams>;

// Claude often returns `null` for unknown contact fields. Accept both
// `null` and `undefined` for any optional string, and normalize to
// `undefined` in the parsed output so downstream code stays simple.
const optStr = z
  .string()
  .nullish()
  .transform((v) => (v == null || v === "" ? undefined : v));

// Optional URL — null/missing/empty/malformed all become undefined so the
// ResultView never builds an <a href> with javascript: or other unsafe schemes.
// Audit P2.11.
const optHttpUrl = z
  .string()
  .nullish()
  .transform((v) => {
    if (v == null || v === "") return undefined;
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
    } catch {
      return undefined;
    }
  });

export const Carrier = z.object({
  company: z.string().min(1),
  province: z.string().min(1),
  city: optStr,
  fleet_size: optStr,
  equipment: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  phone: optStr,
  email: optStr,
  website: optHttpUrl,
  lanes: optStr,
});
export type Carrier = z.infer<typeof Carrier>;

export const LeadsResult = z.object({
  query_summary: z.string(),
  carriers: z.array(Carrier),
  // Tolerate malformed source entries — drop any without a usable URL rather
  // than failing the whole result.
  sources: z
    .array(
      z.object({
        title: z.string().nullish().transform((v) => v ?? ""),
        url: z.string().nullish(),
      }),
    )
    .nullish()
    .transform((arr) =>
      (arr ?? []).filter(
        (s): s is { title: string; url: string } =>
          typeof s.url === "string" && /^https?:\/\//.test(s.url),
      ),
    ),
  cost_estimate_usd: z.number().nullish().transform((v) => v ?? undefined),
  blacklisted_count: z.number().nullish().transform((v) => v ?? 0),
});
export type LeadsResult = z.infer<typeof LeadsResult>;
