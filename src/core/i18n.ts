import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { useSettingsStore } from "./settings-store";

// Initial locale comes from the persisted Zustand store (localStorage).
// Falls back to French if nothing's set.
const initialLocale = useSettingsStore.getState().locale ?? "fr";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  fallbackLng: "fr",
  lng: initialLocale,
  interpolation: { escapeValue: false },
});

// Keep i18next in sync with the Zustand store across the session.
useSettingsStore.subscribe((state, prev) => {
  if (state.locale !== prev.locale) {
    void i18n.changeLanguage(state.locale);
  }
});

export default i18n;
