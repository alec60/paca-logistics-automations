import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  History,
  Settings as SettingsIcon,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { listSkills } from "../core/skill-registry";
import { useSettingsStore } from "../core/settings-store";
import { cn } from "../lib/utils";

const COLLAPSE_KEY = "transport-paca-sidebar-collapsed";

export function Sidebar() {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const skills = listSkills();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
  );

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-100",
      collapsed && "justify-center px-0",
      isActive
        ? "bg-accent-bg text-accent"
        : "text-text-muted hover:bg-surface-2 hover:text-text",
    );

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border-subtle bg-surface-1 transition-[width] duration-100 ease-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-4">
        {!collapsed && (
          <div className="min-w-0 px-2">
            <div className="truncate text-base font-semibold tracking-tight">
              Transport Paca
            </div>
            <div className="truncate text-xs text-text-dim">
              {t("app.sidebar.automations")}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors duration-100 hover:bg-surface-2 hover:text-text",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {skills.length === 0 && !collapsed && (
          <div className="px-3 py-2 text-xs text-text-dim">
            <Layers className="mb-1 inline h-4 w-4" /> {t("app.empty.select_skill")}
          </div>
        )}
        {skills.map((skill) => (
          <NavLink
            key={skill.slug}
            to={`/skills/${skill.slug}`}
            className={linkClass}
            title={collapsed ? skill.name[locale] : undefined}
          >
            <skill.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{skill.name[locale]}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border-subtle p-3">
        <NavLink
          to="/history"
          className={linkClass}
          title={collapsed ? t("app.sidebar.history") : undefined}
        >
          <History className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t("app.sidebar.history")}</span>}
        </NavLink>
        <NavLink
          to="/settings"
          className={linkClass}
          title={collapsed ? t("app.sidebar.settings") : undefined}
        >
          <SettingsIcon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t("app.sidebar.settings")}</span>}
        </NavLink>
      </div>
    </aside>
  );
}
