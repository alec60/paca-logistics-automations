// Accurate SVG map of Canada (real provincial + territorial boundaries from
// @svg-maps/canada) used by the leads / shippers ParamView. Provinces are
// tinted with the brand orange so the map reads on both the dark and light
// themes. Selecting a province reveals an animated NSEW compass at its
// centroid for picking regional sectors.
import { useLayoutEffect, useRef, useState } from "react";
import canadaMap from "@svg-maps/canada";
import { cn } from "../lib/utils";
import type { ProvinceCode } from "../skills/leads/data";

interface Location {
  id: string;
  name: string;
  path: string;
}
const MAP = canadaMap as unknown as { viewBox: string; locations: Location[] };

interface Props {
  selectedProvinces: string[];
  sectors: string[];
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleSector: (sector: string) => void;
  // When true, the map fills its parent's height (for the one-screen leads
  // layout) instead of using the default capped height.
  fill?: boolean;
}

interface Center {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export function CanadaMap({
  selectedProvinces,
  sectors,
  onToggleProvince,
  onToggleSector,
  fill = false,
}: Props) {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const [centers, setCenters] = useState<Record<string, Center>>({});

  // Measure real geometry once so labels + the compass sit at each province's
  // visual centroid regardless of the (irregular) path shapes.
  useLayoutEffect(() => {
    const next: Record<string, Center> = {};
    for (const loc of MAP.locations) {
      const el = pathRefs.current[loc.id];
      if (!el) continue;
      try {
        const b = el.getBBox();
        next[loc.id] = { cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height };
      } catch {
        /* layout not ready */
      }
    }
    setCenters(next);
  }, []);

  // Shrink a province's compass when another selected province sits close by,
  // so two compasses don't overlap. The closer the nearest selected neighbour,
  // the smaller the compass; a lone selection stays full size.
  const selectedCenters = MAP.locations
    .filter((loc) => selectedProvinces.includes(loc.id.toUpperCase()))
    .map((loc) => ({ id: loc.id, c: centers[loc.id] }))
    .filter((x): x is { id: string; c: Center } => !!x.c);

  function compassScale(id: string): number {
    const me = centers[id];
    if (!me) return MAX_COMPASS_SCALE;
    let nearest = Infinity;
    for (const o of selectedCenters) {
      if (o.id === id) continue;
      nearest = Math.min(nearest, Math.hypot(o.c.cx - me.cx, o.c.cy - me.cy));
    }
    if (!Number.isFinite(nearest)) return MAX_COMPASS_SCALE; // only one selected
    // Two compasses just touch when each outer radius == half the gap between
    // their centres. Clamp so it never disappears or grows past the default.
    const fit = nearest / 2 / REACH;
    return Math.max(MIN_COMPASS_SCALE, Math.min(MAX_COMPASS_SCALE, fit));
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-2 shadow-soft",
        fill ? "h-full w-full p-2" : "p-3",
      )}
    >
      <svg
        viewBox={MAP.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className={cn(
          "mx-auto block w-full",
          fill ? "h-full max-h-full" : "h-auto max-h-[540px]",
        )}
        role="group"
        aria-label="Canadian provinces and territories"
      >
        {/* Province silhouettes */}
        {MAP.locations.map((loc) => {
          const code = loc.id.toUpperCase() as ProvinceCode;
          const isSel = selectedProvinces.includes(code);
          return (
            <path
              key={loc.id}
              ref={(el) => {
                pathRefs.current[loc.id] = el;
              }}
              d={loc.path}
              role="button"
              aria-label={loc.name}
              aria-pressed={isSel}
              tabIndex={0}
              onClick={() => onToggleProvince(code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleProvince(code);
                }
              }}
              className={cn(
                "map-prov cursor-pointer outline-none focus-visible:stroke-[color:var(--color-accent)]",
                isSel && "map-prov--selected",
              )}
              strokeWidth={1.25}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            >
              <title>{loc.name}</title>
            </path>
          );
        })}

        {/* Top layer: labels (unselected) + compass (selected) */}
        {MAP.locations.map((loc) => {
          const code = loc.id.toUpperCase() as ProvinceCode;
          const c = centers[loc.id];
          if (!c) return null;
          if (selectedProvinces.includes(code)) {
            return (
              <Compass
                key={loc.id}
                code={code}
                cx={c.cx}
                cy={c.cy}
                scale={compassScale(loc.id)}
                sectors={sectors}
                onToggleSector={onToggleSector}
                onDeselect={() => onToggleProvince(code)}
              />
            );
          }
          // Labels removed — they cluttered the map. Province names still
          // surface on hover via each path's <title>, and the region pills +
          // city search cover identification.
          return null;
        })}
      </svg>
    </div>
  );
}

const OFFSET = 84;
const SEG_R = 30;
const CENTER_R = 24;
// Outer radius of a compass at scale 1 — used to keep neighbours from overlapping.
const REACH = OFFSET + SEG_R;
// The formula below sizes each compass to exactly meet its nearest selected
// neighbour, so any normally-spaced pair (adjacent provinces are ~80+ units
// apart on this 793-wide map) separates cleanly. The floor is purely a
// legibility limit for the rare tight cluster (the tiny Maritimes, ~30 units
// apart) — they can't be both fully separated AND readable, so we keep them
// readable. MAX stays at the original size so isolated provinces look unchanged.
const MIN_COMPASS_SCALE = 0.35;
const MAX_COMPASS_SCALE = 1;
// Unit directions; multiplied by the (scaled) offset at render time.
const DIRS: Array<{ s: "N" | "E" | "S" | "W"; ux: number; uy: number; delay: number }> = [
  { s: "N", ux: 0, uy: -1, delay: 0 },
  { s: "E", ux: 1, uy: 0, delay: 30 },
  { s: "S", ux: 0, uy: 1, delay: 60 },
  { s: "W", ux: -1, uy: 0, delay: 90 },
];

interface CompassProps {
  code: ProvinceCode;
  cx: number;
  cy: number;
  scale: number;
  sectors: string[];
  onToggleSector: (sector: string) => void;
  onDeselect: () => void;
}

function Compass({ code, cx, cy, scale, sectors, onToggleSector, onDeselect }: CompassProps) {
  const offset = OFFSET * scale;
  const segR = SEG_R * scale;
  const centerR = CENTER_R * scale;
  const segFont = 26 * scale;
  const centerFont = 34 * scale;
  return (
    <g>
      {/* faint ring tying the four directions together */}
      <circle
        cx={cx}
        cy={cy}
        r={offset}
        fill="none"
        className="stroke-[color:var(--color-accent)]"
        strokeOpacity={0.35}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      {DIRS.map(({ s, ux, uy, delay }) => {
        const active = sectors.includes(`${code}-${s}`);
        return (
          <g
            key={s}
            transform={`translate(${cx + ux * offset} ${cy + uy * offset})`}
            role="button"
            tabIndex={0}
            aria-label={`${code} ${s}`}
            aria-pressed={active}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSector(`${code}-${s}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleSector(`${code}-${s}`);
              }
            }}
            className="cursor-pointer focus-visible:outline-none"
          >
            <g className="compass-seg" style={{ animationDelay: `${delay}ms` }}>
              <circle
                r={segR}
                className={cn(
                  "transition-colors",
                  active
                    ? "fill-[color:var(--color-accent)] stroke-[color:var(--color-accent)]"
                    : "fill-[color:var(--color-menu-bg)] stroke-[color:var(--color-accent)] hover:fill-[color:var(--color-menu-bg-strong)]",
                )}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className={cn(
                  "pointer-events-none select-none font-mono font-bold",
                  active
                    ? "fill-[color:var(--color-accent-text)]"
                    : "fill-[color:var(--color-accent)]",
                )}
                style={{ fontSize: segFont }}
              >
                {s}
              </text>
            </g>
          </g>
        );
      })}
      {/* center: deselect the province */}
      <g
        transform={`translate(${cx} ${cy})`}
        role="button"
        tabIndex={0}
        aria-label={`Deselect ${code}`}
        onClick={(e) => {
          e.stopPropagation();
          onDeselect();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onDeselect();
          }
        }}
        className="cursor-pointer focus-visible:outline-none"
      >
        <g className="compass-seg">
          <circle
            r={centerR}
            className="fill-[color:var(--color-accent)] stroke-[color:var(--color-accent)] transition-colors hover:fill-[color:var(--color-danger)] hover:stroke-[color:var(--color-danger)]"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none select-none fill-[color:var(--color-accent-text)] font-bold"
            style={{ fontSize: centerFont }}
          >
            ×
          </text>
        </g>
      </g>
    </g>
  );
}
