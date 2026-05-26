import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../core/settings-store";
import type { Locale } from "../core/settings-store";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  function change(next: Locale) {
    setLocale(next);
    void i18n.changeLanguage(next);
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center overflow-hidden rounded-md border border-border-subtle text-xs"
    >
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          className={
            "px-2 py-1 font-mono uppercase " +
            (locale === l
              ? "bg-accent text-accent-text"
              : "text-text-muted hover:bg-surface-2")
          }
          aria-pressed={locale === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
