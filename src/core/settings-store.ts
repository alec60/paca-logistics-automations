import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  apiKey: string;
  locale: Locale;
  theme: Theme;
  monthlyBudgetUsd: number;
  devMode: boolean;
  pinnedCities: string[];
  pinnedLanes: string[];
  historyMirror: HistoryEntry[]; // last 50, localStorage fallback for SQLite

  setApiKey: (key: string) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setMonthlyBudgetUsd: (usd: number) => void;
  setDevMode: (on: boolean) => void;

  togglePinnedCity: (city: string) => void;
  togglePinnedLane: (lane: string) => void;
  pushHistoryMirror: (entry: HistoryEntry) => void;
  clearHistoryMirror: () => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiKey: "",
      locale: "fr",
      theme: "system",
      monthlyBudgetUsd: 20,
      devMode: false,
      pinnedCities: [],
      pinnedLanes: [],
      historyMirror: [],

      setApiKey: (apiKey) => set({ apiKey }),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setMonthlyBudgetUsd: (monthlyBudgetUsd) => set({ monthlyBudgetUsd }),
      setDevMode: (devMode) => set({ devMode }),

      togglePinnedCity: (city) => {
        const pinned = get().pinnedCities;
        set({
          pinnedCities: pinned.includes(city)
            ? pinned.filter((c) => c !== city)
            : [...pinned, city],
        });
      },
      togglePinnedLane: (lane) => {
        const pinned = get().pinnedLanes;
        set({
          pinnedLanes: pinned.includes(lane)
            ? pinned.filter((l) => l !== lane)
            : [...pinned, lane],
        });
      },
      pushHistoryMirror: (entry) => {
        const next = [entry, ...get().historyMirror].slice(0, 50);
        set({ historyMirror: next });
      },
      clearHistoryMirror: () => set({ historyMirror: [] }),

      reset: () =>
        set({
          apiKey: "",
          locale: "fr",
          theme: "system",
          monthlyBudgetUsd: 20,
          devMode: false,
          pinnedCities: [],
          pinnedLanes: [],
          historyMirror: [],
        }),
    }),
    {
      name: "transport-paca-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
