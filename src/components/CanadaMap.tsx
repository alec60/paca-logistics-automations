// Stylized SVG map of Canada. Each province is a clickable polygon; when
// selected, its abbreviation is replaced inline by a compact NSEW sector
// picker centered on the shape. Territories live in their own labeled row
// above the map, as the user prefers — keeps the map clean and emphasizes
// the south-of-60 corridor where the carrier work happens.
import { cn } from "../lib/utils";
import type { ProvinceCode } from "../skills/leads/data";

interface Props {
  selectedProvinces: string[];
  sectors: string[]; // entries shaped "PROV-X"
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleSector: (sector: string) => void;
}

// Province shapes — stylized rounded polygons, not pixel-accurate geography
// but recognizable. viewBox: 0 0 1000 540.
interface ProvinceShape {
  code: ProvinceCode;
  path: string;
  // centroid for the label + the NSEW overlay
  cx: number;
  cy: number;
}

const PROVINCE_SHAPES: ProvinceShape[] = [
  // West coast: BC tall and slightly angled
  { code: "BC", path: "M 80,80 L 200,70 L 215,250 L 195,290 L 90,300 Z", cx: 145, cy: 185 },
  // Prairie provinces — clean rectangles with slight tapering
  { code: "AB", path: "M 220,75 L 320,75 L 320,290 L 220,290 Z", cx: 270, cy: 185 },
  { code: "SK", path: "M 325,75 L 420,75 L 420,290 L 325,290 Z", cx: 372, cy: 185 },
  { code: "MB", path: "M 425,40 L 525,40 L 525,290 L 425,290 Z", cx: 475, cy: 165 },
  // Ontario — large, with bulge toward Hudson Bay
  { code: "ON", path: "M 530,55 L 640,30 L 690,90 L 690,320 L 545,320 L 530,290 Z", cx: 615, cy: 195 },
  // Quebec — extends far north
  { code: "QC", path: "M 695,30 L 830,20 L 850,260 L 820,320 L 695,320 Z", cx: 770, cy: 175 },
  // Newfoundland & Labrador — separated mainland-style shape
  { code: "NL", path: "M 855,30 L 940,40 L 950,180 L 870,200 Z", cx: 905, cy: 110 },
  // Maritimes — compact, off to the southeast
  { code: "NB", path: "M 760,335 L 815,335 L 815,410 L 760,410 Z", cx: 787, cy: 372 },
  { code: "NS", path: "M 825,360 L 900,360 L 905,440 L 835,445 Z", cx: 865, cy: 402 },
  { code: "PE", path: "M 820,330 L 855,328 L 855,348 L 820,350 Z", cx: 838, cy: 339 },
];

const PE_OFFSET_FOR_OVERLAY = { dx: 0, dy: -2 };

export function CanadaMap({
  selectedProvinces,
  sectors,
  onToggleProvince,
  onToggleSector,
}: Props) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-soft">
      <svg
        viewBox="0 0 1000 480"
        className="h-auto w-full"
        role="img"
        aria-label="Canadian provinces"
      >
        {/* Subtle ocean bg */}
        <rect width="1000" height="480" fill="transparent" />

        {/* Province polygons */}
        {PROVINCE_SHAPES.map((s) => {
          const isSelected = selectedProvinces.includes(s.code);
          return (
            <g key={s.code}>
              <path
                d={s.path}
                onClick={() => onToggleProvince(s.code)}
                className={cn(
                  "cursor-pointer transition-colors duration-120",
                  isSelected
                    ? "fill-[color:var(--color-accent-bg)] stroke-[color:var(--color-accent)]"
                    : "fill-[color:var(--color-surface-2)] stroke-[color:var(--color-border)] hover:fill-[color:var(--color-surface-3)]",
                )}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {!isSelected && (
                <text
                  x={s.cx}
                  y={s.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none fill-[color:var(--color-text-muted)] font-mono text-[18px] font-semibold tracking-wider"
                >
                  {s.code}
                </text>
              )}

              {isSelected && (
                <SectorOverlay
                  code={s.code}
                  cx={s.cx + (s.code === "PE" ? PE_OFFSET_FOR_OVERLAY.dx : 0)}
                  cy={s.cy + (s.code === "PE" ? PE_OFFSET_FOR_OVERLAY.dy : 0)}
                  sectors={sectors}
                  onToggleSector={onToggleSector}
                  onDeselect={() => onToggleProvince(s.code)}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface OverlayProps {
  code: ProvinceCode;
  cx: number;
  cy: number;
  sectors: string[];
  onToggleSector: (sector: string) => void;
  onDeselect: () => void;
}

// Compact NSEW cluster centered on the province. Drawn as SVG so it scales
// cleanly inside the polygon and never overflows.
function SectorOverlay({
  code,
  cx,
  cy,
  sectors,
  onToggleSector,
  onDeselect,
}: OverlayProps) {
  const r = 12;
  const dirs: Array<{ s: "N" | "S" | "E" | "W"; dx: number; dy: number }> = [
    { s: "N", dx: 0, dy: -22 },
    { s: "S", dx: 0, dy: 22 },
    { s: "E", dx: 22, dy: 0 },
    { s: "W", dx: -22, dy: 0 },
  ];

  return (
    <g>
      {dirs.map(({ s, dx, dy }) => {
        const active = sectors.includes(`${code}-${s}`);
        return (
          <g
            key={s}
            transform={`translate(${cx + dx} ${cy + dy})`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSector(`${code}-${s}`);
            }}
            className="cursor-pointer"
          >
            <circle
              r={r}
              className={cn(
                "transition-colors duration-120",
                active
                  ? "fill-[color:var(--color-accent)] stroke-[color:var(--color-accent)]"
                  : "fill-[color:var(--color-surface-1)] stroke-[color:var(--color-border)] hover:fill-[color:var(--color-surface-3)]",
              )}
              strokeWidth={1}
            />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn(
                "pointer-events-none font-mono text-[11px] font-bold",
                active
                  ? "fill-[color:var(--color-accent-text)]"
                  : "fill-[color:var(--color-text-muted)]",
              )}
            >
              {s}
            </text>
          </g>
        );
      })}
      {/* Center deselect button */}
      <g
        transform={`translate(${cx} ${cy})`}
        onClick={(e) => {
          e.stopPropagation();
          onDeselect();
        }}
        className="cursor-pointer"
      >
        <circle
          r={9}
          className="fill-[color:var(--color-bg)] stroke-[color:var(--color-border)] hover:fill-[color:var(--color-danger)]"
          strokeWidth={1}
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none fill-[color:var(--color-text-muted)] text-[12px] font-bold"
        >
          ×
        </text>
      </g>
      {/* Province label, faint, above the cluster */}
      <text
        x={cx}
        y={cy - 36}
        textAnchor="middle"
        className="pointer-events-none fill-[color:var(--color-accent)] font-mono text-[11px] font-semibold tracking-widest"
      >
        {code}
      </text>
    </g>
  );
}
