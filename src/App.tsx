import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { ThemeToggle } from "./components/ThemeToggle";
import { CommandPalette } from "./components/CommandPalette";
import { DevPanel } from "./components/DevPanel";
import { BrandLogo } from "./components/BrandLogo";
import { COMPANY_PASSCODE, useLockStore } from "./core/lock-store";
import { useSettingsStore } from "./core/settings-store";
import { useRuntimeSecrets } from "./core/runtime-secrets";

// Resolve the chosen theme ("system" follows the OS preference) to a concrete
// "light" | "dark", and keep it in sync if the OS preference changes.
function useResolvedTheme(): "light" | "dark" {
  const theme = useSettingsStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

export default function App() {
  // No user-facing passcode prompt anymore. The embedded key still drives the
  // at-rest decryption of the stored API key, so we apply it automatically on
  // launch and then load the ciphertext into the in-memory runtime store.
  const unlockedAt = useLockStore((s) => s.unlockedAt);
  const unlock = useLockStore((s) => s.unlock);
  const apiKeyEncrypted = useSettingsStore((s) => s.apiKeyEncrypted);
  const loadFromCiphertext = useRuntimeSecrets((s) => s.loadFromCiphertext);
  const resolvedTheme = useResolvedTheme();

  useEffect(() => {
    if (unlockedAt) return;
    (async () => {
      const result = await unlock(COMPANY_PASSCODE);
      if (result.ok) await loadFromCiphertext(apiKeyEncrypted);
    })();
  }, [unlockedAt, unlock, loadFromCiphertext, apiKeyEncrypted]);

  if (!unlockedAt) return null;

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border-subtle bg-surface-1 px-6 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>
        {/* data-theme scopes light/dark to the content only — the navy chrome
            (sidebar + header) stays fixed so the brand logo keeps blending. */}
        <main data-theme={resolvedTheme} className="flex-1 overflow-auto bg-bg">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <DevPanel />
    </div>
  );
}
