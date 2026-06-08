import { Monitor, Sun, Moon } from "lucide-react";
import { useSettingsStore, type Theme } from "../core/settings-store";

const OPTIONS: { value: Theme; Icon: typeof Monitor; label: string }[] = [
  { value: "system", Icon: Monitor, label: "System" },
  { value: "light", Icon: Sun, label: "Light" },
  { value: "dark", Icon: Moon, label: "Dark" },
];

// Compact theme switcher for the (always-dark) header chrome. Mirrors the
// LanguageSwitcher's look, so it uses the fixed chrome tokens, not the themed
// content tokens.
export function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center overflow-hidden rounded-md border border-border-subtle"
    >
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={label}
          className={
            "flex h-7 w-7 items-center justify-center transition-colors " +
            (theme === value
              ? "bg-accent text-accent-text"
              : "text-text-muted hover:bg-surface-2 hover:text-text")
          }
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
