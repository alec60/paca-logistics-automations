import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      {Icon && <Icon className="h-6 w-6 text-text-dim" />}
      <div className="text-sm text-text">{title}</div>
      {description && <div className="max-w-sm text-xs text-text-muted">{description}</div>}
      {action}
    </div>
  );
}
