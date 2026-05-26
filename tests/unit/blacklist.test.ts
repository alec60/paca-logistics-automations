import { describe, expect, it } from "vitest";
import { normalizeCompany } from "../../src/core/blacklist";

describe("normalizeCompany", () => {
  it("strips Inc/Ltd/Corp suffixes", () => {
    expect(normalizeCompany("Acme Inc.")).toBe("acme");
    expect(normalizeCompany("ACME Ltd")).toBe("acme");
    expect(normalizeCompany("Acme Corp.")).toBe("acme");
  });

  it("strips industry suffixes (Transport/Trucking/Transports)", () => {
    expect(normalizeCompany("Acme Transport Inc.")).toBe("acme");
    expect(normalizeCompany("Acme Trucking")).toBe("acme");
  });

  it("does not strip French articles (limitation — see AGENTS.md)", () => {
    // The normalizer is suffix-aware, not article-aware. A future polish pass
    // could strip Les/Le/La/L' to match "Les Transports Acme" with "Acme Inc."
    expect(normalizeCompany("Les Transports Acme")).toBe("lesacme");
  });

  it("collapses punctuation and whitespace", () => {
    expect(normalizeCompany("  A.C.M.E  ")).toBe("acme");
    expect(normalizeCompany("A-C-M-E")).toBe("acme");
  });

  it("matches case-insensitively", () => {
    expect(normalizeCompany("ACME inc")).toBe(normalizeCompany("Acme Inc"));
  });

  it("returns empty for empty input", () => {
    expect(normalizeCompany("")).toBe("");
    expect(normalizeCompany("   ")).toBe("");
  });
});
