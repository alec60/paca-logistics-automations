import { describe, expect, it } from "vitest";
import { pointInPolygon, pointsInPolygon } from "../../src/skills/leads/geo";

const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe("pointInPolygon", () => {
  it("detects inside vs outside", () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
    expect(pointInPolygon(15, 5, square)).toBe(false);
    expect(pointInPolygon(-1, -1, square)).toBe(false);
  });

  it("handles a concave (L-shaped) polygon", () => {
    const L: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 3],
      [3, 3],
      [3, 10],
      [0, 10],
    ];
    expect(pointInPolygon(1, 1, L)).toBe(true);
    expect(pointInPolygon(8, 8, L)).toBe(false); // in the notch
  });
});

describe("pointsInPolygon", () => {
  it("returns names of points inside, de-duplicated", () => {
    const pts = [
      { name: "A", x: 5, y: 5 },
      { name: "B", x: 50, y: 50 },
      { name: "C", x: 2, y: 2 },
      { name: "A", x: 6, y: 6 },
    ];
    expect(pointsInPolygon(pts, square).sort()).toEqual(["A", "C"]);
  });

  it("returns [] for a degenerate polygon", () => {
    expect(pointsInPolygon([{ name: "A", x: 1, y: 1 }], [[0, 0], [1, 1]])).toEqual([]);
  });
});
