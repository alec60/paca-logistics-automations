import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { CommandPalette } from "./components/CommandPalette";
import { DevPanel } from "./components/DevPanel";
import { LockScreen } from "./components/LockScreen";
import { LockButton } from "./components/LockButton";
import { BrandLogo } from "./components/BrandLogo";
import { useLockStore } from "./core/lock-store";

export default function App() {
  // Lock gate — must come BEFORE the rest of the app renders. There's no
  // "skip" path: every UI consumer reads `unlockedAt` to verify the key is
  // in memory.
  const unlockedAt = useLockStore((s) => s.unlockedAt);
  if (!unlockedAt) return <LockScreen />;

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
            <LockButton />
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
