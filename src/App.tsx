import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { BudgetMeter } from "./components/BudgetMeter";
import { LanguageSwitcher } from "./components/LanguageSwitcher";

export default function App() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b border-border-subtle bg-surface-1 px-6 py-3"
        >
          <div className="font-mono text-sm text-text-muted">Transport Paca</div>
          <div className="flex items-center gap-4">
            <BudgetMeter />
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
