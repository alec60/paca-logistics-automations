import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Ciphertext } from "./crypto";
import { logAudit } from "./audit-log";

export type Theme = "system" | "dark" | "light";
export type Locale = "en" | "fr";

export interface HistoryEntry {
  id: number;
  skill_slug: string;
  params_json: string;
  cost_usd: number | null;
  searched_at: string;
}

export interface SettingsState {
  /**
   * Encrypted ciphertext for the Anthropic API key.
   * Decrypted into `runtime-secrets.apiKey` after the lock screen unlocks.
   * Persisted to localStorage as `{ iv, ct }` base64.
   */
  apiKeyEncrypted: Ciphertext | null;

  locale: Locale;
  theme: Theme;
  monthlyBudgetUsd: number;
  devMode: boolean;
  pinnedCities: string[];
  pinnedLanes: string[];
  historyMirror: HistoryEntry[];

  setApiKeyEncrypted: (c: Ciphertext | null) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setMonthlyBudgetUsd: (usd: number) => void;
  setDevMode: (on: boolean) => void;

  togglePinnedCity: (city: string) => void;
  togglePinnedLane: (lane: string) => void;
  pushHistoryMirror: (entry: HistoryEntry) => void;
  clearHistoryMirror: () => void;
  reset: () => void;

  // Export/import of the persisted state — used for manual cross-device sync
  // until the team picks a backend (Cloudflare Worker / Supabase / etc.).
  // `minimal` (default true) drops the apiKeyEncrypted ciphertext and the
  // historyMirror; only language + theme + budget + pinned items travel.
  // Per audit P2.8: the full export is a real key/data leak risk if shared.
  exportSnapshot: (opts?: { includeSecrets?: boolean; includeHistory?: boolean }) => string;
  importSnapshot: (json: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiKeyEncrypted: null,
      locale: "fr",
      theme: "system",
      monthlyBudgetUsd: 20,
      devMode: false,
      pinnedCities: [],
      pinnedLanes: [],
      historyMirror: [],

      setApiKeyEncrypted: (apiKeyEncrypted) => set({ apiKeyEncrypted }),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setMonthlyBudgetUsd: (monthlyBudgetUsd) => set({ monthlyBudgetUsd }),
      setDevMode: (devMode) => set({ devMode }),

      togglePinnedCity: (city) => {
        const pinned = get().pinnedCities;
        const wasPinned = pinned.includes(city);
        set({
          pinnedCities: wasPinned
            ? pinned.filter((c) => c !== city)
            : [...pinned, city],
        });
        logAudit("pin", `${wasPinned ? "Unpinned" : "Pinned"} city: ${city}`);
      },
      togglePinnedLane: (lane) => {
        const pinned = get().pinnedLanes;
        const wasPinned = pinned.includes(lane);
        set({
          pinnedLanes: wasPinned
            ? pinned.filter((l) => l !== lane)
            : [...pinned, lane],
        });
        logAudit("pin", `${wasPinned ? "Unpinned" : "Pinned"} lane: ${lane}`);
      },
      pushHistoryMirror: (entry) => {
        const next = [entry, ...get().historyMirror].slice(0, 50);
        set({ historyMirror: next });
        logAudit("history", `Search recorded (${entry.skill_slug})`, {
          cost_usd: entry.cost_usd,
        });
      },
      clearHistoryMirror: () => set({ historyMirror: [] }),

      reset: () =>
        set({
          apiKeyEncrypted: null,
          locale: "fr",
          theme: "system",
          monthlyBudgetUsd: 20,
          devMode: false,
          pinnedCities: [],
          pinnedLanes: [],
          historyMirror: [],
        }),

      exportSnapshot: (opts) => {
        const s = get();
        const includeSecrets = opts?.includeSecrets ?? false;
        const includeHistory = opts?.includeHistory ?? false;
        const data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          includesSecrets: includeSecrets,
          includesHistory: includeHistory,
          state: {
            apiKeyEncrypted: includeSecrets ? s.apiKeyEncrypted : null,
            locale: s.locale,
            theme: s.theme,
            monthlyBudgetUsd: s.monthlyBudgetUsd,
            pinnedCities: s.pinnedCities,
            pinnedLanes: s.pinnedLanes,
            historyMirror: includeHistory ? s.historyMirror : [],
          },
        };
        return JSON.stringify(data, null, 2);
      },

      importSnapshot: (json) => {
        const parsed = JSON.parse(json) as {
          version?: number;
          state?: Partial<SettingsState>;
        };
        if (parsed.version !== 1 || !parsed.state) {
          throw new Error("Unrecognized snapshot format (expected version: 1).");
        }
        const s = parsed.state;
        set({
          apiKeyEncrypted: s.apiKeyEncrypted ?? get().apiKeyEncrypted,
          locale: s.locale ?? get().locale,
          theme: s.theme ?? get().theme,
          monthlyBudgetUsd: s.monthlyBudgetUsd ?? get().monthlyBudgetUsd,
          pinnedCities: s.pinnedCities ?? get().pinnedCities,
          pinnedLanes: s.pinnedLanes ?? get().pinnedLanes,
          historyMirror: s.historyMirror ?? get().historyMirror,
        });
      },
    }),
    {
      name: "transport-paca-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
