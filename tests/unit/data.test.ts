import { describe, expect, it } from "vitest";
import {
  PROVINCES,
  CITIES,
  TRUCK_TYPES,
  LANE_PRESETS,
  buildAllLanes,
  isLanePreset,
} from "../../src/skills/leads/data";

describe("leads data", () => {
  it("has all 13 Canadian provinces & territories", () => {
    expect(PROVINCES).toHaveLength(13);
    const codes = PROVINCES.map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
      ]),
    );
  });

  it("has 35 cities (Section 13 spec)", () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(35);
  });

  it("has the 10 truck types from Section 13", () => {
    expect(TRUCK_TYPES).toHaveLength(10);
  });

  it("buildAllLanes returns 13×12 = 156 permutations", () => {
    expect(buildAllLanes()).toHaveLength(156);
  });

  it("has 18 lane presets", () => {
    expect(LANE_PRESETS).toHaveLength(18);
  });

  it("isLanePreset matches the preset list", () => {
    expect(isLanePreset("QC→ON")).toBe(true);
    expect(isLanePreset("AB→NU")).toBe(false);
  });
});
