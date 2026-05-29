// Transport Paca brand logo — the full banner (icon + wordmark) served from
// public/brand-logo.png. Prefer a transparent-background PNG so it sits cleanly
// on the navy header bar. BASE_URL keeps the path correct under the GitHub
// Pages sub-path as well as Tauri / dev ("/").
import { cn } from "../lib/utils";

interface Props {
  className?: string;
}

export function BrandLogo({ className }: Props) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}brand-logo.png`}
      alt="Transport Paca — Carrier Intel"
      className={cn("h-12 w-auto select-none", className)}
      draggable={false}
    />
  );
}
