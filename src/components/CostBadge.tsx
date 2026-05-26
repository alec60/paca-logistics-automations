export interface CostBadgeProps {
  usd: number;
}

export function CostBadge({ usd }: CostBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-xs text-text-muted">
      <span className="text-text-dim">≈</span>${usd.toFixed(3)}
    </span>
  );
}
