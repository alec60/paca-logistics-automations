// Transport Paca wordmark.
// A coral-orange "TP" mark (T crossbar = the road, P circle = the cargo) next
// to the wordmark. SVG for crisp scaling in header, favicon, and PWA icons.
import { cn } from "../lib/utils";

interface Props {
  className?: string;
  /** If true, show only the mark (no wordmark) — for favicon/icon use. */
  iconOnly?: boolean;
}

export function BrandLogo({ className, iconOnly = false }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 40 40"
        width="28"
        height="28"
        role="img"
        aria-label="Transport Paca"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="tp-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#ffa94d" />
          </linearGradient>
        </defs>
        {/* Rounded square plate */}
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#tp-grad)" />
        {/* T crossbar = the road */}
        <rect x="9" y="11" width="22" height="3.2" rx="1.6" fill="#1a1f2e" />
        {/* T stem (slightly offset to make room for the P) */}
        <rect x="13.4" y="11" width="3.2" height="18" rx="1.6" fill="#1a1f2e" />
        {/* P bowl */}
        <path
          d="M21.5 14 h5.2 a4.3 4.3 0 0 1 0 8.6 h-5.2 z"
          fill="none"
          stroke="#1a1f2e"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* P stem */}
        <rect x="21.5" y="11" width="3.2" height="18" rx="1.6" fill="#1a1f2e" />
      </svg>
      {!iconOnly && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-text">
            Transport <span className="text-gradient-accent">Paca</span>
          </span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
            Carrier intel
          </span>
        </span>
      )}
    </div>
  );
}
