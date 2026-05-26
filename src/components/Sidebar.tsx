import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { History, Settings as SettingsIcon, Layers } from "lucide-react";
import { listSkills } from "../core/skill-registry";
import { useSettingsStore } from "../core/settings-store";
import { cn } from "../lib/utils";

export function Sidebar() {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const skills = listSkills();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 rounded px-3 py-2 text-sm",
      isActive
        ? "bg-accent-bg text-accent"
        : "text-text-muted hover:bg-surface-2 hover:text-text",
    );

  return (
    <aside className="flex w-60 flex-col border-r border-border-subtle bg-surface-1">
      <div className="px-5 py-4">
        <div className="text-base font-semibold tracking-tight">Transport Paca</div>
        <div className="text-xs text-text-dim">{t("app.sidebar.automations")}</div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {skills.length === 0 && (
          <div className="px-3 py-2 text-xs text-text-dim">
            <Layers className="mb-1 inline h-4 w-4" /> {t("app.empty.select_skill")}
          </div>
        )}
        {skills.map((skill) => (
          <NavLink key={skill.slug} to={`/skills/${skill.slug}`} className={linkClass}>
            <skill.icon className="h-4 w-4" />
            <span>{skill.name[locale]}</span>
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-border-subtle p-3">
        <NavLink to="/history" className={linkClass}>
          <History className="h-4 w-4" />
          <span>{t("app.sidebar.history")}</span>
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon className="h-4 w-4" />
          <span>{t("app.sidebar.settings")}</span>
        </NavLink>
      </div>
    </aside>
  );
}
