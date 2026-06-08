import { cn } from "../lib/utils";

// Themed shimmer placeholder. `bg-surface-3` reads on both the dark canvas and
// the light one; `animate-pulse` is the only motion (respects the global
// reduced-motion stance well enough for a non-essential loading cue).
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-surface-3", className)} />;
}

// Loading state shown while a skill's search runs — mirrors the ResultView
// layout (header + table rows) so the transition to real results is seamless.
export function ResultSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex flex-col gap-4 p-8" role="status" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-subtle">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border-subtle px-4 py-3 last:border-b-0"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[12%]" />
            <Skeleton className="h-4 w-[24%]" />
            <Skeleton className="h-4 w-[18%]" />
            <Skeleton className="h-4 w-[14%]" />
          </div>
        ))}
      </div>

      {label && <span className="text-center text-xs text-text-muted">{label}</span>}
    </div>
  );
}
