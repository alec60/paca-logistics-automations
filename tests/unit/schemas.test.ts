import { describe, expect, it } from "vitest";
import { LeadsParams, Carrier, LeadsResult } from "../../src/skills/leads/schemas";

describe("LeadsParams", () => {
  it("accepts a minimal valid payload", () => {
    const p = LeadsParams.parse({
      truck_types: ["Flatbed"],
      fleet_size: "any",
      count: 10,
    });
    expect(p.truck_types).toEqual(["Flatbed"]);
    expect(p.provinces).toEqual([]);
    expect(p.sectors).toEqual([]);
    expect(p.cities).toEqual([]);
    expect(p.lanes).toEqual([]);
  });

  it("rejects an empty truck_types list", () => {
    expect(() =>
      LeadsParams.parse({ truck_types: [], fleet_size: "any", count: 10 }),
    ).toThrow();
  });

  it("rejects an unknown truck type", () => {
    expect(() =>
      LeadsParams.parse({ truck_types: ["Hovercraft"], fleet_size: "any", count: 10 }),
    ).toThrow();
  });

  it("rejects a non-allowed lead count", () => {
    expect(() =>
      LeadsParams.parse({ truck_types: ["Flatbed"], fleet_size: "any", count: 7 }),
    ).toThrow();
  });

  it("validates sector format PROV-X", () => {
    expect(() =>
      LeadsParams.parse({
        truck_types: ["Flatbed"],
        fleet_size: "any",
        count: 10,
        sectors: ["QC-N", "ON-S"],
      }),
    ).not.toThrow();
    expect(() =>
      LeadsParams.parse({
        truck_types: ["Flatbed"],
        fleet_size: "any",
        count: 10,
        sectors: ["QC-Z"],
      }),
    ).toThrow();
  });

  it("validates lane format PROV→PROV", () => {
    expect(() =>
      LeadsParams.parse({
        truck_types: ["Flatbed"],
        fleet_size: "any",
        count: 10,
        lanes: ["QC→ON"],
      }),
    ).not.toThrow();
    expect(() =>
      LeadsParams.parse({
        truck_types: ["Flatbed"],
        fleet_size: "any",
        count: 10,
        lanes: ["QC->ON"],
      }),
    ).toThrow();
  });
});

describe("Carrier", () => {
  it("accepts minimal carrier", () => {
    expect(
      Carrier.parse({ company: "Test Carrier Inc.", province: "QC" }),
    ).toMatchObject({ company: "Test Carrier Inc.", province: "QC", equipment: [] });
  });

  it("rejects missing company", () => {
    expect(() => Carrier.parse({ company: "", province: "QC" })).toThrow();
  });
});

describe("LeadsResult", () => {
  it("defaults sources to [] and blacklisted_count to 0", () => {
    const r = LeadsResult.parse({
      query_summary: "ok",
      carriers: [{ company: "Demo Transport Ltd.", province: "ON" }],
    });
    expect(r.sources).toEqual([]);
    expect(r.blacklisted_count).toBe(0);
  });

  it("rejects bad source URLs", () => {
    expect(() =>
      LeadsResult.parse({
        query_summary: "x",
        carriers: [],
        sources: [{ title: "bad", url: "not a url" }],
      }),
    ).toThrow();
  });
});
