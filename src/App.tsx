import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { CommandPalette } from "./components/CommandPalette";
import { DevPanel } from "./components/DevPanel";
import { BrandLogo } from "./components/BrandLogo";
import { COMPANY_PASSCODE, useLockStore } from "./core/lock-store";
import { useSettingsStore } from "./core/settings-store";
import { useRuntimeSecrets } from "./core/runtime-secrets";

export default function App() {
  // No user-facing passcode prompt anymore. The embedded key still drives the
  // at-rest decryption of the stored API key, so we apply it automatically on
  // launch and then load the ciphertext into the in-memory runtime store.
  const unlockedAt = useLockStore((s) => s.unlockedAt);
  const unlock = useLockStore((s) => s.unlock);
  const apiKeyEncrypted = useSettingsStore((s) => s.apiKeyEncrypted);
  const loadFromCiphertext = useRuntimeSecrets((s) => s.loadFromCiphertext);

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
            <kbd className="rounded border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
              Ctrl + K
            </kbd>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-bg">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <DevPanel />
    </div>
  );
}
