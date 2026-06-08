import { z } from "zod";
import { PROVINCES, INDUSTRIES, FREIGHT_EQUIPMENT, VOLUME_LEVELS, SHIPPER_COUNTS } from "./data";

const provinceCodes = PROVINCES.map((p) => p.code) as unknown as readonly [string, ...string[]];
const shipperCounts = SHIPPER_COUNTS as unknown as readonly [number, ...number[]];
const volumeValues = VOLUME_LEVELS.map((v) => v.value) as unknown as readonly [string, ...string[]];

export const ShippersParams = z.object({
  industries: z.array(z.enum(INDUSTRIES)).min(1, "Pick at least one industry"),
  // Equipment the freight needs — same vocabulary as the carrier finder so a
  // found shipper can be matched to found carriers. Optional (empty = any).
  freight_equipment: z.array(z.enum(FREIGHT_EQUIPMENT)).default([]),
  // Approximate shipping volume / frequency. Soft qualifier, defaults to "any".
  volume: z.enum(volumeValues).default("any"),
  count: z
    .number()
    .int()
    .refine((n) => (shipperCounts as readonly number[]).includes(n), {
      message: "Invalid prospect count",
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
export type ShippersParams = z.infer<typeof ShippersParams>;

// Claude often returns `null` for unknown fields. Accept both null and
// undefined for any optional string, normalize to `undefined`.
const optStr = z
  .string()
  .nullish()
  .transform((v) => (v == null || v === "" ? undefined : v));

// Optional URL — null/missing/empty/malformed all become undefined so the
// ResultView never builds an <a href> with javascript: or other unsafe schemes.
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

export const Shipper = z.object({
  // `company` is required and is the key the blacklist matches on (shared with
  // the carrier finder's Carrier shape).
  company: z.string().min(1),
  industry: optStr,
  province: z.string().min(1),
  city: optStr,
  est_volume: optStr,
  freight_profile: optStr,
  why_prospect: optStr,
  lanes: optStr,
  contact_name: optStr,
  phone: optStr,
  email: optStr,
  website: optHttpUrl,
});
export type Shipper = z.infer<typeof Shipper>;

export const ShippersResult = z.object({
  query_summary: z.string(),
  shippers: z.array(Shipper),
  // Tolerate malformed source entries — drop any without a usable URL rather
  // than failing the whole result.
  sources: z
    .array(
      z.object({
        title: z
          .string()
          .nullish()
          .transform((v) => v ?? ""),
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
  cost_estimate_usd: z
    .number()
    .nullish()
    .transform((v) => v ?? undefined),
  blacklisted_count: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
});
export type ShippersResult = z.infer<typeof ShippersResult>;
