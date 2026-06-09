import { describe, expect, it } from "vitest";
import { ShippersParams, Shipper, ShippersResult } from "../../src/skills/shippers/schemas";

describe("ShippersParams", () => {
  it("accepts a minimal valid payload and applies defaults", () => {
    const p = ShippersParams.parse({ industries: ["Manufacturing"], count: 10 });
    expect(p.industries).toEqual(["Manufacturing"]);
    expect(p.freight_equipment).toEqual([]);
    expect(p.volume).toBe("any");
    expect(p.provinces).toEqual([]);
    expect(p.sectors).toEqual([]);
    expect(p.cities).toEqual([]);
    expect(p.lanes).toEqual([]);
  });

  it("rejects an empty industries list", () => {
    expect(() => ShippersParams.parse({ industries: [], count: 10 })).toThrow();
  });

  it("rejects an unknown industry", () => {
    expect(() => ShippersParams.parse({ industries: ["Cryptomining"], count: 10 })).toThrow();
  });

  it("rejects a non-allowed prospect count", () => {
    expect(() => ShippersParams.parse({ industries: ["Manufacturing"], count: 7 })).toThrow();
  });

  it("accepts the shared freight-equipment vocabulary", () => {
    const p = ShippersParams.parse({
      industries: ["Food & Beverage"],
      count: 10,
      freight_equipment: ["Tanker", "Dry Van"],
    });
    expect(p.freight_equipment).toEqual(["Tanker", "Dry Van"]);
  });

  it("rejects an unknown freight-equipment value", () => {
    expect(() =>
      ShippersParams.parse({
        industries: ["Manufacturing"],
        count: 10,
        freight_equipment: ["Spaceship"],
      }),
    ).toThrow();
  });

  it("validates sector format PROV-X", () => {
    expect(() =>
      ShippersParams.parse({
        industries: ["Manufacturing"],
        count: 10,
        sectors: ["QC-N", "ON-S"],
      }),
    ).not.toThrow();
    expect(() =>
      ShippersParams.parse({ industries: ["Manufacturing"], count: 10, sectors: ["QC-Z"] }),
    ).toThrow();
  });

  it("validates lane format PROV→PROV", () => {
    expect(() =>
      ShippersParams.parse({ industries: ["Manufacturing"], count: 10, lanes: ["QC→ON"] }),
    ).not.toThrow();
    expect(() =>
      ShippersParams.parse({ industries: ["Manufacturing"], count: 10, lanes: ["QC->ON"] }),
    ).toThrow();
  });
});

describe("Shipper", () => {
  it("accepts a minimal shipper", () => {
    expect(Shipper.parse({ company: "Demo Manufacturing Ltd.", province: "QC" })).toMatchObject({
      company: "Demo Manufacturing Ltd.",
      province: "QC",
    });
  });

  it("rejects a missing company", () => {
    expect(() => Shipper.parse({ company: "", province: "QC" })).toThrow();
  });

  it("normalizes a malformed website to undefined (no unsafe href)", () => {
    const s = Shipper.parse({
      company: "Demo Foods Inc.",
      province: "ON",
      website: "javascript:alert(1)",
    });
    expect(s.website).toBeUndefined();
  });
});

describe("ShippersResult", () => {
  it("defaults sources to [] and blacklisted_count to 0", () => {
    const r = ShippersResult.parse({
      query_summary: "ok",
      shippers: [{ company: "Demo Distribution Ltd.", province: "ON" }],
    });
    expect(r.sources).toEqual([]);
    expect(r.blacklisted_count).toBe(0);
  });

  it("silently drops sources with bad URLs (does not throw)", () => {
    const r = ShippersResult.parse({
      query_summary: "x",
      shippers: [],
      sources: [
        { title: "bad", url: "not a url" },
        { title: "good", url: "https://example.com" },
      ],
    });
    expect(r.sources).toEqual([{ title: "good", url: "https://example.com" }]);
  });

  it("accepts null for optional shipper fields (Anthropic returns null, not undefined)", () => {
    const r = ShippersResult.parse({
      query_summary: "x",
      shippers: [
        {
          company: "Demo Manufacturing Ltd.",
          province: "QC",
          city: null,
          industry: null,
          why_prospect: null,
          phone: null,
          email: null,
          website: null,
        },
      ],
    });
    expect(r.shippers[0].city).toBeUndefined();
    expect(r.shippers[0].why_prospect).toBeUndefined();
    expect(r.shippers[0].website).toBeUndefined();
  });
});
