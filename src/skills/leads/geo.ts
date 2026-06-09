// Geometry helpers for the leads map's paint-select.

/** Even-odd ray-casting point-in-polygon. `polygon` is a ring of [x, y] pairs
 *  in the same coordinate space as (x, y). The ring may be open or closed. */
export function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Names of every projected point whose (x, y) falls inside the paint polygon.
 *  Tests ALL points (even ones too small to be drawn) so painting a region
 *  selects the tiny towns too. Returns de-duplicated names. */
export function pointsInPolygon<T extends { name: string; x: number; y: number }>(
  points: T[],
  polygon: [number, number][],
): string[] {
  if (polygon.length < 3) return [];
  const out = new Set<string>();
  for (const p of points) {
    if (pointInPolygon(p.x, p.y, polygon)) out.add(p.name);
  }
  return [...out];
}
