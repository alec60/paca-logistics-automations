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

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 shadow-soft">
      <svg
        viewBox={MAP.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto w-full max-h-[540px]"
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
const DIRS: Array<{ s: "N" | "E" | "S" | "W"; dx: number; dy: number; delay: number }> = [
  { s: "N", dx: 0, dy: -OFFSET, delay: 0 },
  { s: "E", dx: OFFSET, dy: 0, delay: 30 },
  { s: "S", dx: 0, dy: OFFSET, delay: 60 },
  { s: "W", dx: -OFFSET, dy: 0, delay: 90 },
];

interface CompassProps {
  code: ProvinceCode;
  cx: number;
  cy: number;
  sectors: string[];
  onToggleSector: (sector: string) => void;
  onDeselect: () => void;
}

function Compass({ code, cx, cy, sectors, onToggleSector, onDeselect }: CompassProps) {
  return (
    <g>
      {/* faint ring tying the four directions together */}
      <circle
        cx={cx}
        cy={cy}
        r={OFFSET}
        fill="none"
        className="stroke-[color:var(--color-accent)]"
        strokeOpacity={0.35}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      {DIRS.map(({ s, dx, dy, delay }) => {
        const active = sectors.includes(`${code}-${s}`);
        return (
          <g
            key={s}
            transform={`translate(${cx + dx} ${cy + dy})`}
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
                r={SEG_R}
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
                style={{ fontSize: 26 }}
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
            r={CENTER_R}
            className="fill-[color:var(--color-accent)] stroke-[color:var(--color-accent)] transition-colors hover:fill-[color:var(--color-danger)] hover:stroke-[color:var(--color-danger)]"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none select-none fill-[color:var(--color-accent-text)] font-bold"
            style={{ fontSize: 34 }}
          >
            ×
          </text>
        </g>
      </g>
    </g>
  );
}
