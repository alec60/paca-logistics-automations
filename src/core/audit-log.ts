// In-memory audit log of "things that happened in this session."
// The dev-mode panel reads from this — turning dev mode on shows a live tail
// of pin / blacklist / history / unlock events for the current session.
//
// Capped at 200 entries; oldest fall off. Not persisted across refreshes by
// design — the log is for "what just happened" debugging, not forensics.
import { create } from "zustand";

export type AuditCategory =
  | "pin"
  | "blacklist"
  | "history"
  | "lock"
  | "settings"
  | "search";

export interface AuditEvent {
  id: number;
  ts: number;
  category: AuditCategory;
  message: string;
  meta?: Record<string, unknown>;
}

interface AuditState {
  events: AuditEvent[];
  record: (category: AuditCategory, message: string, meta?: Record<string, unknown>) => void;
  clear: () => void;
}

let counter = 0;

export const useAuditLog = create<AuditState>((set) => ({
  events: [],
  record(category, message, meta) {
    set((s) => ({
      events: [
        { id: ++counter, ts: Date.now(), category, message, meta },
        ...s.events,
      ].slice(0, 200),
    }));
  },
  clear() {
    set({ events: [] });
  },
}));

// Convenience helper for non-React modules that don't want to subscribe.
export function logAudit(
  category: AuditCategory,
  message: string,
  meta?: Record<string, unknown>,
) {
  useAuditLog.getState().record(category, message, meta);
}
