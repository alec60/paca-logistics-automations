// Stylized SVG map of Canada used by the leads ParamView.
// All 13 provinces + territories drawn with cubic Beziers for organic
// edges (Pacific coast curve on BC, Hudson Bay carve on ON/QC, Labrador
// peninsula above the Maritimes). Selecting any region replaces its
// abbreviation with an inline NSEW cluster + center deselect.
import { cn } from "../lib/utils";
import type { ProvinceCode } from "../skills/leads/data";

interface Props {
  selectedProvinces: string[];
  sectors: string[];
  onToggleProvince: (code: ProvinceCode) => void;
  onToggleSector: (sector: string) => void;
}

// viewBox: 0 0 1000 480. Tightened aspect ratio so the map doesn't
// dominate the form vertically.
interface ProvinceShape {
  code: ProvinceCode;
  path: string;
  cx: number;
  cy: number;
  overlayScale?: number;
}

const SHAPES: ProvinceShape[] = [
  // ──────────── Territories (top band, y: 30–170) ────────────
  {
    code: "YT",
    // Slender west, jagged Alaska-facing edge
    path: "M 55,80 C 50,60 70,42 95,42 L 175,42 C 195,42 200,55 200,80 L 215,170 C 215,185 200,195 175,193 L 100,190 C 70,188 58,178 55,160 Z",
    cx: 130,
    cy: 120,
  },
  {
    code: "NT",
    // Very wide, drops a wedge into NU at the right
    path: "M 215,55 C 220,40 245,38 275,38 L 460,38 C 500,40 520,55 525,85 L 540,180 C 540,195 525,200 495,200 L 245,200 C 220,195 215,180 215,170 Z",
    cx: 370,
    cy: 120,
  },
  {
    code: "NU",
    // Top-right, irregular Arctic coast
    path: "M 540,45 C 580,30 640,28 700,32 L 815,38 C 855,45 875,70 870,110 L 855,180 C 850,200 820,205 760,200 L 560,195 C 545,190 540,180 540,170 Z",
    cx: 700,
    cy: 115,
  },

  // ──────────── West / BC (y: 200–410) ────────────
  {
    code: "BC",
    // Tall column with wavy Pacific coast on the left
    path: "M 60,210 C 50,230 55,255 65,275 C 75,295 60,315 70,340 C 80,365 65,385 80,405 C 95,418 110,425 130,420 L 220,418 L 225,250 C 220,225 210,210 200,205 L 85,200 C 75,200 65,205 60,210 Z",
    cx: 145,
    cy: 320,
  },

  // ──────────── Prairies (y: 210–410) ────────────
  {
    code: "AB",
    // Slight northward flare to mirror the AB/NWT border at 60°N
    path: "M 230,205 C 230,205 245,202 260,202 L 325,205 C 335,210 335,215 335,235 L 330,400 C 325,412 320,415 305,415 L 240,415 C 230,412 228,408 228,395 Z",
    cx: 280,
    cy: 310,
  },
  {
    code: "SK",
    path: "M 340,205 C 350,202 365,202 385,203 L 430,205 C 440,210 440,220 438,235 L 432,400 C 428,412 422,415 410,415 L 345,415 C 340,412 338,408 338,395 Z",
    cx: 385,
    cy: 310,
  },
  {
    code: "MB",
    // Hudson Bay carve on the upper east
    path: "M 445,195 C 455,193 475,193 495,193 L 535,200 C 540,215 540,235 540,260 C 538,275 525,280 528,295 C 532,308 536,320 535,335 L 530,400 C 525,412 515,415 500,415 L 450,412 C 445,408 442,402 442,395 Z",
    cx: 488,
    cy: 305,
  },

  // ──────────── Central (y: 200–420) ────────────
  {
    code: "ON",
    // Huge — north bulge to Hudson Bay, southern peninsula toward the Great Lakes
    path: "M 545,225 C 555,215 580,210 605,210 L 670,215 C 685,220 695,235 695,255 L 700,310 C 700,345 695,375 685,395 C 675,410 660,420 645,420 L 555,420 C 545,415 545,405 545,395 Z",
    cx: 615,
    cy: 325,
  },
  {
    code: "QC",
    // Vast — touches Ungava in the north, St Lawrence on the south
    path: "M 695,215 C 720,205 760,200 790,205 L 830,220 C 845,235 850,260 845,290 L 845,355 C 840,385 825,410 800,420 L 710,420 C 695,415 690,400 692,380 Z",
    cx: 770,
    cy: 320,
  },

  // ──────────── Atlantic ────────────
  {
    code: "NL",
    // Two parts — Labrador mainland on top, Newfoundland island below
    path:
      // Labrador
      "M 855,215 C 880,205 910,205 935,215 C 945,235 945,275 940,310 C 935,335 920,355 900,355 L 855,350 C 845,330 845,290 850,260 Z " +
      // Newfoundland island (detached)
      "M 880,390 C 905,380 935,385 950,400 C 955,420 945,440 925,448 L 895,455 C 875,450 870,432 875,415 Z",
    cx: 900,
    cy: 285,
    overlayScale: 0.85,
  },
  {
    code: "NB",
    path: "M 740,425 C 745,422 760,420 775,422 L 805,425 C 815,435 815,455 808,475 L 790,490 C 770,492 750,485 745,475 C 738,460 738,440 740,425 Z",
    cx: 775,
    cy: 455,
  },
  {
    code: "PE",
    // Tiny island, just above NS
    path: "M 815,418 C 830,414 850,415 858,422 C 862,432 850,440 830,440 L 818,438 C 813,432 813,424 815,418 Z",
    cx: 836,
    cy: 428,
    overlayScale: 0.55,
  },
  {
    code: "NS",
    // Mainland + Cape Breton angled SE
    path: "M 820,450 C 835,445 855,445 875,450 C 895,460 905,480 900,500 L 880,520 C 855,520 835,512 825,500 C 815,485 815,468 820,450 Z",
    cx: 858,
    cy: 482,
  },
];

export function CanadaMap({
  selectedProvinces,
  sectors,
  onToggleProvince,
  onToggleSector,
}: Props) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2 p-2 shadow-soft">
      <svg
        viewBox="0 0 1000 545"
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto w-full max-h-[400px]"
        role="img"
        aria-label="Canadian provinces and territories"
      >
        {SHAPES.map((s) => {
          const isSelected = selectedProvinces.includes(s.code);
          return (
            <g key={s.code}>
              <path
                d={s.path}
                onClick={() => onToggleProvince(s.code)}
                className={cn(
                  "cursor-pointer transition-all duration-120",
                  isSelected
                    ? "fill-[color:var(--color-accent-bg)] stroke-[color:var(--color-accent)]"
                    : "fill-[color:var(--color-surface-3)] stroke-[color:var(--color-border)] hover:fill-[color:var(--color-border)]",
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
                  className="pointer-events-none fill-[color:var(--color-text-muted)] font-mono text-[16px] font-semibold tracking-widest"
                >
                  {s.code}
                </text>
              )}

              {isSelected && (
                <SectorOverlay
                  code={s.code}
                  cx={s.cx}
                  cy={s.cy}
                  scale={s.overlayScale ?? 1}
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
  scale: number;
  sectors: string[];
  onToggleSector: (sector: string) => void;
  onDeselect: () => void;
}

function SectorOverlay({
  code,
  cx,
  cy,
  scale,
  sectors,
  onToggleSector,
  onDeselect,
}: OverlayProps) {
  const r = 12 * scale;
  const offset = 22 * scale;
  const centerR = 9 * scale;
  const dirs: Array<{ s: "N" | "S" | "E" | "W"; dx: number; dy: number }> = [
    { s: "N", dx: 0, dy: -offset },
    { s: "S", dx: 0, dy: offset },
    { s: "E", dx: offset, dy: 0 },
    { s: "W", dx: -offset, dy: 0 },
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
                "pointer-events-none font-mono font-bold",
                active
                  ? "fill-[color:var(--color-accent-text)]"
                  : "fill-[color:var(--color-text-muted)]",
              )}
              fontSize={11 * scale}
            >
              {s}
            </text>
          </g>
        );
      })}
      <g
        transform={`translate(${cx} ${cy})`}
        onClick={(e) => {
          e.stopPropagation();
          onDeselect();
        }}
        className="cursor-pointer"
      >
        <circle
          r={centerR}
          className="fill-[color:var(--color-bg)] stroke-[color:var(--color-border)] hover:fill-[color:var(--color-danger)]"
          strokeWidth={1}
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none fill-[color:var(--color-text-muted)] font-bold"
          fontSize={12 * scale}
        >
          ×
        </text>
      </g>
      <text
        x={cx}
        y={cy - 38 * scale}
        textAnchor="middle"
        className="pointer-events-none fill-[color:var(--color-accent)] font-mono font-semibold tracking-widest"
        fontSize={11 * scale}
      >
        {code}
      </text>
    </g>
  );
}
