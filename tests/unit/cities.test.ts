import { describe, expect, it } from "vitest";
import { PLACES, CITIES, CITY_TO_PROVINCE, cityKey, parseCityKey } from "../../src/skills/leads/cities";

const CODES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);

describe("places dataset", () => {
  it("is comprehensive — every town, weighted to the small ones", () => {
    expect(PLACES.length).toBeGreaterThan(15000);
    expect(PLACES.filter((p) => p.pop < 1000).length).toBeGreaterThan(10000);
  });

  it("every place has a valid province, a name, and Canadian coordinates", () => {
    for (const p of PLACES) {
      expect(CODES.has(p.province)).toBe(true);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.lat).toBeGreaterThan(41);
      expect(p.lat).toBeLessThan(83);
      expect(p.lng).toBeGreaterThan(-142);
      expect(p.lng).toBeLessThan(-52);
    }
  });

  it("resolves well-known cities to the right province", () => {
    expect(CITY_TO_PROVINCE["Toronto"]).toBe("ON");
    expect(CITY_TO_PROVINCE["Calgary"]).toBe("AB");
    expect(CITY_TO_PROVINCE["Montréal"]).toBe("QC");
    expect(CITY_TO_PROVINCE["Halifax"]).toBe("NS");
    expect(CITY_TO_PROVINCE["Winnipeg"]).toBe("MB");
  });

  it("includes small / remote towns", () => {
    expect(CITIES).toContain("Tuktoyaktuk");
  });

  it("CITIES is unique and alphabetically sorted", () => {
    expect(new Set(CITIES).size).toBe(CITIES.length);
    expect(CITIES).toEqual([...CITIES].sort((a, b) => a.localeCompare(b, "en")));
  });
});

describe("place keys (the over-selection fix)", () => {
  it("round-trips name + province", () => {
    const k = cityKey("Mount Pleasant", "ON");
    expect(k).toBe("Mount Pleasant|ON");
    expect(parseCityKey(k)).toEqual({ name: "Mount Pleasant", province: "ON" });
  });

  it("every place has a UNIQUE key (so selecting one never lights up another)", () => {
    const keys = PLACES.map((p) => cityKey(p.name, p.province));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("duplicate town names exist across provinces — proving why keys are needed", () => {
    const names = PLACES.map((p) => p.name);
    expect(new Set(names).size).toBeLessThan(names.length);
  });
});
