// Interactive Canada map for the leads finder.
// - Real geographic projection (d3 Lambert conformal conic) so every town sits
//   where it actually is — which is what makes paint-select accurate.
// - Province click toggles a province; city dot click toggles a city.
// - PAINT mode: drag a region; every town inside it (down to the tiny ones,
//   even those too small to be drawn) gets added to the selection.
// - ZOOM: vertical sidebar slider + scroll wheel + drag to pan. Zooming in
//   reveals smaller towns (level-of-detail).
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
import { geoConicConformal, geoPath } from "d3-geo";
import { Pencil, Hand, Plus, Minus, Maximize2 } from "lucide-react";
import CANADA from "../skills/leads/canada.geo";
import { PLACES } from "../skills/leads/cities";
import type { ProvinceCode } from "../skills/leads/data";
import { pointsInPolygon } from "../skills/leads/geo";
import { cn } from "../lib/utils";

const NAME_TO_CODE: Record<string, ProvinceCode> = {
  Quebec: "QC", "Newfoundland and Labrador": "NL", "British Columbia": "BC",
  Nunavut: "NU", "Northwest Territories": "NT", "New Brunswick": "NB",
  "Nova Scotia": "NS", Saskatchewan: "SK", Alberta: "AB",
  "Prince Edward Island": "PE", "Yukon Territory": "YT", Manitoba: "MB", Ontario: "ON",
};

const MIN_K = 1;
const MAX_K = 40;
const DOT_R = 2.4; // screen px at scale 1
const DOT_CAP = 4000; // max dots drawn at once (paint still hits ALL towns)

interface Props {
  selectedProvinces: string[];
  selectedCities: string[];
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleCity: (name: string) => void;
  onAddCities: (names: string[]) => void;
}

interface CityPt {
  name: string;
  prov: ProvinceCode;
  x: number;
  y: number;
  pop: number;
}
interface ProvPath {
  code: ProvinceCode | undefined;
  name: string;
  d: string;
}

export function LeadsMap({
  selectedProvinces,
  selectedCities,
  onToggleProvince,
  onToggleCity,
  onAddCities,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [mode, setMode] = useState<"pan" | "paint">("pan");
  const [paintPts, setPaintPts] = useState<[number, number][]>([]);
  const drag = useRef({ active: false, painting: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Measure immediately (don't wait for ResizeObserver — some embedded
    // webviews don't tick RO callbacks), then keep in sync via RO + window.
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const ready = size.w > 10 && size.h > 10;

  const projection = useMemo(() => {
    if (!ready) return null;
    return geoConicConformal()
      .parallels([49, 77])
      .rotate([95, 0])
      .fitSize([size.w, size.h], CANADA);
  }, [ready, size.w, size.h]);

  const provincePaths = useMemo<ProvPath[]>(() => {
    if (!projection) return [];
    const path = geoPath(projection);
    return CANADA.features
      .map((f) => ({
        code: NAME_TO_CODE[f.properties.name],
        name: f.properties.name,
        d: path(f) ?? "",
      }))
      .filter((p) => p.d);
  }, [projection]);

  const cityPts = useMemo<CityPt[]>(() => {
    if (!projection) return [];
    const out: CityPt[] = [];
    for (const p of PLACES) {
      const xy = projection([p.lng, p.lat]);
      if (!xy) continue;
      out.push({ name: p.name, prov: p.province, x: xy[0], y: xy[1], pop: p.pop });
    }
    return out;
  }, [projection]);

  // Level of detail: fewer dots when zoomed out, reveal small towns on zoom-in.
  const minPop = Math.max(0, 50000 / (view.k * view.k));
  const visibleDots = useMemo(() => {
    const sel = new Set(selectedCities);
    const cands = cityPts.filter((c) => c.pop >= minPop || sel.has(c.name));
    if (cands.length <= DOT_CAP) return cands;
    return cands
      .slice()
      .sort(
        (a, b) =>
          (sel.has(b.name) ? 1 : 0) - (sel.has(a.name) ? 1 : 0) || b.pop - a.pop,
      )
      .slice(0, DOT_CAP);
  }, [cityPts, minPop, selectedCities]);

  // ---- zoom ----
  const zoomAround = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const bx = (px - v.x) / v.k;
      const by = (py - v.y) / v.k;
      return { k, x: px - bx * k, y: py - by * k };
    });
  }, []);
  const setZoom = useCallback(
    (k: number) =>
      setView((v) => {
        const nk = Math.min(MAX_K, Math.max(MIN_K, k));
        const cx = size.w / 2;
        const cy = size.h / 2;
        const bx = (cx - v.x) / v.k;
        const by = (cy - v.y) / v.k;
        return { k: nk, x: cx - bx * nk, y: cy - by * nk };
      }),
    [size.w, size.h],
  );
  const reset = useCallback(() => setView({ k: 1, x: 0, y: 0 }), []);

  // Native non-passive wheel listener so we can preventDefault the page scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAround(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAround, ready]);

  // ---- pointer: pan or paint ----
  const localPt = (e: RPointerEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const onPointerDown = (e: RPointerEvent) => {
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic or already-released pointer — fine */
    }
    const [px, py] = localPt(e);
    if (mode === "paint") {
      drag.current = { active: true, painting: true, lastX: px, lastY: py };
      setPaintPts([[px, py]]);
    } else {
      drag.current = { active: true, painting: false, lastX: px, lastY: py };
    }
  };
  const onPointerMove = (e: RPointerEvent) => {
    if (!drag.current.active) return;
    const [px, py] = localPt(e);
    if (drag.current.painting) {
      setPaintPts((pts) => [...pts, [px, py]]);
    } else {
      const dx = px - drag.current.lastX;
      const dy = py - drag.current.lastY;
      drag.current.lastX = px;
      drag.current.lastY = py;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };
  const onPointerUp = () => {
    if (drag.current.painting) {
      const { k, x, y } = viewRef.current;
      setPaintPts((pts) => {
        if (pts.length >= 3) {
          const poly = pts.map(
            ([sx, sy]) => [(sx - x) / k, (sy - y) / k] as [number, number],
          );
          const names = pointsInPolygon(cityPts, poly);
          if (names.length) onAddCities(names);
        }
        return [];
      });
    }
    drag.current = { active: false, painting: false, lastX: 0, lastY: 0 };
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden rounded-lg border border-border-subtle bg-surface-2"
    >
      {ready && (
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          className={cn("block touch-none select-none", mode === "paint" ? "cursor-crosshair" : "cursor-grab")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <MapLayers
              provincePaths={provincePaths}
              visibleDots={visibleDots}
              k={view.k}
              selectedProvinces={selectedProvinces}
              selectedCities={selectedCities}
              paintMode={mode === "paint"}
              onToggleProvince={onToggleProvince}
              onToggleCity={onToggleCity}
            />
          </g>
          {paintPts.length > 1 && (
            <path
              d={"M" + paintPts.map(([x, y]) => `${x} ${y}`).join("L") + "Z"}
              className="fill-[color:var(--color-accent)] stroke-[color:var(--color-accent)]"
              fillOpacity={0.12}
              strokeOpacity={0.85}
              strokeWidth={1.5}
              pointerEvents="none"
            />
          )}
        </svg>
      )}

      {/* Sidebar controls */}
      <div className="absolute right-2 top-2 flex flex-col items-center gap-1 rounded-lg border border-border-subtle bg-menu-bg/90 p-1 shadow-soft backdrop-blur">
        <CtrlButton
          active={mode === "paint"}
          title="Paint an area to select towns"
          onClick={() => setMode("paint")}
        >
          <Pencil className="h-4 w-4" />
        </CtrlButton>
        <CtrlButton active={mode === "pan"} title="Pan / select" onClick={() => setMode("pan")}>
          <Hand className="h-4 w-4" />
        </CtrlButton>
        <div className="my-0.5 h-px w-5 bg-border-subtle" />
        <CtrlButton title="Zoom in" onClick={() => setZoom(viewRef.current.k * 1.4)}>
          <Plus className="h-4 w-4" />
        </CtrlButton>
        <input
          type="range"
          min={MIN_K}
          max={MAX_K}
          step={0.1}
          value={view.k}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="h-28 cursor-pointer accent-accent"
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
        />
        <CtrlButton title="Zoom out" onClick={() => setZoom(viewRef.current.k / 1.4)}>
          <Minus className="h-4 w-4" />
        </CtrlButton>
        <div className="my-0.5 h-px w-5 bg-border-subtle" />
        <CtrlButton title="Reset view" onClick={reset}>
          <Maximize2 className="h-4 w-4" />
        </CtrlButton>
      </div>

      {/* hint */}
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-menu-bg/85 px-2 py-1 text-[10px] text-text-muted backdrop-blur">
        {mode === "paint"
          ? "Drag to paint a region — every town inside is selected"
          : "Click provinces/towns · scroll to zoom · drag to pan"}
      </div>
    </div>
  );
}

function CtrlButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-gradient-accent text-accent-text"
          : "text-text-muted hover:bg-surface-3 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

const MapLayers = memo(function MapLayers({
  provincePaths,
  visibleDots,
  k,
  selectedProvinces,
  selectedCities,
  paintMode,
  onToggleProvince,
  onToggleCity,
}: {
  provincePaths: ProvPath[];
  visibleDots: CityPt[];
  k: number;
  selectedProvinces: string[];
  selectedCities: string[];
  paintMode: boolean;
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleCity: (name: string) => void;
}) {
  const selCities = useMemo(() => new Set(selectedCities), [selectedCities]);
  const selProvs = useMemo(() => new Set(selectedProvinces), [selectedProvinces]);
  return (
    <>
      {provincePaths.map((p) => (
        <path
          key={p.name}
          d={p.d}
          className={cn("map-prov", p.code && selProvs.has(p.code) && "map-prov--selected")}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: paintMode ? "crosshair" : "pointer", pointerEvents: paintMode ? "none" : "auto" }}
          onClick={(e) => {
            if (!paintMode && p.code) {
              e.stopPropagation();
              onToggleProvince(p.code);
            }
          }}
        >
          <title>{p.name}</title>
        </path>
      ))}
      {visibleDots.map((c, i) => {
        const selected = selCities.has(c.name);
        return (
          <circle
            key={`${c.prov}:${c.name}:${i}`}
            cx={c.x}
            cy={c.y}
            r={(selected ? DOT_R * 1.7 : DOT_R) / k}
            className={selected ? "fill-[color:var(--color-accent)]" : "fill-[color:var(--color-text-muted)]"}
            fillOpacity={selected ? 1 : 0.5}
            style={{ pointerEvents: paintMode ? "none" : "auto", cursor: "pointer" }}
            onClick={(e) => {
              if (!paintMode) {
                e.stopPropagation();
                onToggleCity(c.name);
              }
            }}
          >
            <title>
              {c.name}, {c.prov}
              {c.pop ? ` · ${c.pop.toLocaleString()}` : ""}
            </title>
          </circle>
        );
      })}
    </>
  );
});
