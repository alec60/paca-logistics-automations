import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "system" | "dark" | "light";
export type Locale = "en" | "fr";

export interface SettingsState {
  apiKey: string;
  locale: Locale;
  theme: Theme;
  monthlyBudgetUsd: number;
  devMode: boolean;
  setApiKey: (key: string) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setMonthlyBudgetUsd: (usd: number) => void;
  setDevMode: (on: boolean) => void;
  reset: () => void;
}

// Settings are persisted to localStorage. Phase 2 wires a Tauri FS mirror to
// appDataDir/settings.json (per Locked Decision 5).
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      locale: "fr",
      theme: "system",
      monthlyBudgetUsd: 20,
      devMode: false,
      setApiKey: (apiKey) => set({ apiKey }),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setMonthlyBudgetUsd: (monthlyBudgetUsd) => set({ monthlyBudgetUsd }),
      setDevMode: (devMode) => set({ devMode }),
      reset: () =>
        set({
          apiKey: "",
          locale: "fr",
          theme: "system",
          monthlyBudgetUsd: 20,
          devMode: false,
        }),
    }),
    {
      name: "transport-paca-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
