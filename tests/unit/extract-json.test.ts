import { describe, expect, it } from "vitest";
import { balancedObjects, extractJson } from "../../src/core/extract-json";
import { ModelOutputError } from "../../src/core/types";

describe("extractJson", () => {
  it("parses a clean, prose-free JSON object", () => {
    expect(extractJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });

  it("recovers JSON when the model narrates first (the leads bug)", () => {
    // This is the exact failure mode: web_search narration concatenated ahead
    // of the result object made bare JSON.parse throw "Unexpected token 'I'".
    const raw =
      'I need to search for Canadian trucking carriers first.\n' +
      'Based on my research, here are the results:\n' +
      '{"query_summary":"flatbed QC","carriers":[],"sources":[]}';
    expect(extractJson(raw)).toEqual({
      query_summary: "flatbed QC",
      carriers: [],
      sources: [],
    });
  });

  it("strips ```json code fences", () => {
    const raw = '```json\n{"carriers":[{"company":"Test Carrier Inc."}]}\n```';
    expect(extractJson(raw)).toEqual({
      carriers: [{ company: "Test Carrier Inc." }],
    });
  });

  it("ignores stray braces inside narration prose", () => {
    const raw =
      'Use the schema {like this} to format. Final answer:\n' +
      '{"carriers":[{"company":"Demo Transport Ltd.","city":"Laval"}],"sources":[]}';
    expect(extractJson(raw)).toEqual({
      carriers: [{ company: "Demo Transport Ltd.", city: "Laval" }],
      sources: [],
    });
  });

  it("ignores braces that appear inside JSON string values", () => {
    const raw = '{"note":"closes at } 5pm","n":2}';
    expect(extractJson(raw)).toEqual({ note: "closes at } 5pm", n: 2 });
  });

  it("throws a clean ModelOutputError when there is no JSON at all", () => {
    expect(() => extractJson("I cannot help with that request.")).toThrow(
      ModelOutputError,
    );
  });

  it("throws ModelOutputError on truncated/unbalanced JSON", () => {
    expect(() => extractJson('{"carriers":[{"company":"Te')).toThrow(
      ModelOutputError,
    );
  });
});

describe("balancedObjects", () => {
  it("returns each top-level object, skipping prose", () => {
    expect(balancedObjects('a {"x":1} b {"y":2} c')).toEqual(['{"x":1}', '{"y":2}']);
  });

  it("treats a nested object as a single top-level slice", () => {
    expect(balancedObjects('{"a":{"b":1}}')).toEqual(['{"a":{"b":1}}']);
  });
});
