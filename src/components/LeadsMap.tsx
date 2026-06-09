// Interactive Canada map for the leads finder.
// - Real geographic projection (d3 Lambert conformal conic) so every town sits
//   where it actually is — which is what makes marker-select accurate.
// - Province click toggles a province; city dot click toggles that one place.
// - MARKER mode: a circular brush of an adjustable radius. Click to drop it, or
//   drag to sweep; every town under it (down to the tiny ones) is selected.
// - ZOOM: scroll wheel / trackpad; drag to pan. Level-of-detail reveals smaller
//   towns as you zoom in, and is quantized so panning/zooming don't re-render
//   the (thousands of) dots — only crossing a zoom step does.
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
import { Brush, Hand, Maximize2 } from "lucide-react";
import CANADA from "../skills/leads/canada.geo";
import { PLACES, cityKey } from "../skills/leads/cities";
import type { ProvinceCode } from "../skills/leads/data";
import { pointsWithinBrush } from "../skills/leads/geo";
import { cn } from "../lib/utils";

const NAME_TO_CODE: Record<string, ProvinceCode> = {
  Quebec: "QC", "Newfoundland and Labrador": "NL", "British Columbia": "BC",
  Nunavut: "NU", "Northwest Territories": "NT", "New Brunswick": "NB",
  "Nova Scotia": "NS", Saskatchewan: "SK", Alberta: "AB",
  "Prince Edward Island": "PE", "Yukon Territory": "YT", Manitoba: "MB", Ontario: "ON",
};

const MIN_K = 1;
const MAX_K = 40;
const DOT_R = 2.4; // screen px (at the quantized scale)
const DOT_CAP = 4000; // max dots drawn at once (marker still hits ALL towns)

interface Props {
  selectedProvinces: string[];
  selectedCities: string[]; // place keys ("name|province")
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleCity: (key: string) => void;
  onAddCities: (keys: string[]) => void;
}

interface CityPt {
  key: string;
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
  const [mode, setMode] = useState<"pan" | "marker">("pan");
  const [radius, setRadius] = useState(45); // brush radius in screen px
  const radiusRef = useRef(radius);
  radiusRef.current = radius;
  const [brushPts, setBrushPts] = useState<[number, number][]>([]);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const drag = useRef({ active: false, brushing: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
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
    return geoConicConformal().parallels([49, 77]).rotate([95, 0]).fitSize([size.w, size.h], CANADA);
  }, [ready, size.w, size.h]);

  const provincePaths = useMemo<ProvPath[]>(() => {
    if (!projection) return [];
    const path = geoPath(projection);
    return CANADA.features
      .map((f) => ({ code: NAME_TO_CODE[f.properties.name], name: f.properties.name, d: path(f) ?? "" }))
      .filter((p) => p.d);
  }, [projection]);

  const cityPts = useMemo<CityPt[]>(() => {
    if (!projection) return [];
    const out: CityPt[] = [];
    for (const p of PLACES) {
      const xy = projection([p.lng, p.lat]);
      if (!xy) continue;
      out.push({ key: cityKey(p.name, p.province), name: p.name, prov: p.province, x: xy[0], y: xy[1], pop: p.pop });
    }
    return out;
  }, [projection]);

  // Quantize zoom into half-octave steps so LOD + dot size only change at a
  // step boundary — panning and small zooms don't re-render the dots.
  const level = ready ? Math.round(2 * Math.log2(view.k)) : 0;
  const kq = Math.pow(2, level / 2);
  const minPop = 50000 / (kq * kq);
  const dotR = DOT_R / kq;

  const selectedKeys = useMemo(() => new Set(selectedCities), [selectedCities]);
  const selectedProvSet = useMemo(() => new Set(selectedProvinces), [selectedProvinces]);

  const visibleDots = useMemo(() => {
    const cands = cityPts.filter((c) => c.pop >= minPop || selectedKeys.has(c.key));
    if (cands.length <= DOT_CAP) return cands;
    return cands
      .slice()
      .sort((a, b) => (selectedKeys.has(b.key) ? 1 : 0) - (selectedKeys.has(a.key) ? 1 : 0) || b.pop - a.pop)
      .slice(0, DOT_CAP);
  }, [cityPts, minPop, selectedKeys]);

  // ---- zoom (wheel/trackpad only) ----
  const zoomAround = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const bx = (px - v.x) / v.k;
      const by = (py - v.y) / v.k;
      return { k, x: px - bx * k, y: py - by * k };
    });
  }, []);
  const reset = useCallback(() => setView({ k: 1, x: 0, y: 0 }), []);

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

  // ---- pointer: pan or brush ----
  const localPt = (e: RPointerEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const onPointerDown = (e: RPointerEvent) => {
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic / already-released */
    }
    const [px, py] = localPt(e);
    if (mode === "marker") {
      drag.current = { active: true, brushing: true, lastX: px, lastY: py };
      setBrushPts([[px, py]]);
    } else {
      drag.current = { active: true, brushing: false, lastX: px, lastY: py };
    }
  };
  const onPointerMove = (e: RPointerEvent) => {
    const [px, py] = localPt(e);
    if (mode === "marker") setCursor([px, py]);
    if (!drag.current.active) return;
    if (drag.current.brushing) {
      setBrushPts((pts) => [...pts, [px, py]]);
    } else {
      const dx = px - drag.current.lastX;
      const dy = py - drag.current.lastY;
      drag.current.lastX = px;
      drag.current.lastY = py;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };
  const finishBrush = () => {
    if (!drag.current.brushing) {
      drag.current = { active: false, brushing: false, lastX: 0, lastY: 0 };
      return;
    }
    const { k, x, y } = viewRef.current;
    const r = radiusRef.current;
    setBrushPts((pts) => {
      if (pts.length >= 1) {
        const centers = pts.map(([sx, sy]) => [(sx - x) / k, (sy - y) / k] as [number, number]);
        const hits = pointsWithinBrush(cityPts, centers, r / k);
        if (hits.length) onAddCities(hits.map((h) => h.key));
      }
      return [];
    });
    drag.current = { active: false, brushing: false, lastX: 0, lastY: 0 };
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
          className={cn("block touch-none select-none", mode === "marker" ? "cursor-crosshair" : "cursor-grab")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishBrush}
          onPointerLeave={() => {
            setCursor(null);
            finishBrush();
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <MapLayers
              provincePaths={provincePaths}
              visibleDots={visibleDots}
              dotR={dotR}
              selectedKeys={selectedKeys}
              selectedProvinces={selectedProvSet}
              markerMode={mode === "marker"}
              onToggleProvince={onToggleProvince}
              onToggleCity={onToggleCity}
            />
          </g>

          {/* brush stroke (screen space) */}
          {mode === "marker" &&
            brushPts.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={radius}
                className="fill-[color:var(--color-accent)] stroke-[color:var(--color-accent)]"
                fillOpacity={0.12}
                strokeOpacity={0.7}
                strokeWidth={1.25}
                pointerEvents="none"
              />
            ))}
          {/* live cursor preview of the marker size */}
          {mode === "marker" && cursor && brushPts.length === 0 && (
            <circle
              cx={cursor[0]}
              cy={cursor[1]}
              r={radius}
              className="fill-[color:var(--color-accent)] stroke-[color:var(--color-accent)]"
              fillOpacity={0.07}
              strokeOpacity={0.6}
              strokeWidth={1.25}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}
        </svg>
      )}

      {/* controls */}
      <div className="absolute right-2 top-2 flex flex-col items-stretch gap-1 rounded-lg border border-border-subtle bg-menu-bg/90 p-1 shadow-soft backdrop-blur">
        <div className="flex gap-1">
          <CtrlButton active={mode === "pan"} title="Pan / click to select" onClick={() => setMode("pan")}>
            <Hand className="h-4 w-4" />
          </CtrlButton>
          <CtrlButton
            active={mode === "marker"}
            title="Marker — drop/drag to select towns in range"
            onClick={() => setMode("marker")}
          >
            <Brush className="h-4 w-4" />
          </CtrlButton>
          <CtrlButton title="Reset view" onClick={reset}>
            <Maximize2 className="h-4 w-4" />
          </CtrlButton>
        </div>
        {mode === "marker" && (
          <label className="flex items-center gap-1.5 px-1 pb-0.5 text-[10px] text-text-muted">
            <Brush className="h-3 w-3 shrink-0" />
            <input
              type="range"
              min={12}
              max={160}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              aria-label="Marker radius"
              className="h-1.5 w-24 cursor-pointer accent-accent"
            />
          </label>
        )}
      </div>

      {/* hint */}
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-menu-bg/85 px-2 py-1 text-[10px] text-text-muted backdrop-blur">
        {mode === "marker"
          ? "Drop or drag the marker — towns within the circle are selected · wheel to zoom"
          : "Click provinces/towns · wheel/trackpad to zoom · drag to pan"}
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
        active ? "bg-gradient-accent text-accent-text" : "text-text-muted hover:bg-surface-3 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

const MapLayers = memo(function MapLayers({
  provincePaths,
  visibleDots,
  dotR,
  selectedKeys,
  selectedProvinces,
  markerMode,
  onToggleProvince,
  onToggleCity,
}: {
  provincePaths: ProvPath[];
  visibleDots: CityPt[];
  dotR: number;
  selectedKeys: Set<string>;
  selectedProvinces: Set<string>;
  markerMode: boolean;
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleCity: (key: string) => void;
}) {
  return (
    <>
      {provincePaths.map((p) => (
        <path
          key={p.name}
          d={p.d}
          className={cn("map-prov", p.code && selectedProvinces.has(p.code) && "map-prov--selected")}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: markerMode ? "crosshair" : "pointer", pointerEvents: markerMode ? "none" : "auto" }}
          onClick={(e) => {
            if (!markerMode && p.code) {
              e.stopPropagation();
              onToggleProvince(p.code);
            }
          }}
        >
          <title>{p.name}</title>
        </path>
      ))}
      {visibleDots.map((c, i) => {
        const selected = selectedKeys.has(c.key);
        return (
          <circle
            key={`${c.key}:${i}`}
            cx={c.x}
            cy={c.y}
            r={selected ? dotR * 1.7 : dotR}
            className={selected ? "fill-[color:var(--color-accent)]" : "fill-[color:var(--color-text-muted)]"}
            fillOpacity={selected ? 1 : 0.5}
            style={{ pointerEvents: markerMode ? "none" : "auto", cursor: "pointer" }}
            onClick={(e) => {
              if (!markerMode) {
                e.stopPropagation();
                onToggleCity(c.key);
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
