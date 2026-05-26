import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Truck, History, Settings as SettingsIcon, Languages } from "lucide-react";
import { listSkills } from "../core/skill-registry";
import { useSettingsStore } from "../core/settings-store";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const skills = listSkills();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  function switchLang(to: "fr" | "en") {
    setOpen(false);
    setLocale(to);
    void i18n.changeLanguage(to);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-border-subtle bg-surface-1 shadow-xl">
        <Command label="Command palette" className="flex flex-col">
          <Command.Input
            autoFocus
            placeholder={locale === "fr" ? "Tapez une commande…" : "Type a command…"}
            className="w-full border-b border-border-subtle bg-transparent px-4 py-3 text-sm outline-none placeholder:text-text-dim"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-xs text-text-dim">
              {locale === "fr" ? "Aucun résultat" : "No results"}
            </Command.Empty>
            <Command.Group heading={t("app.sidebar.automations")}>
              {skills.map((s) => (
                <Command.Item
                  key={s.slug}
                  value={`automation ${s.name.en} ${s.name.fr}`}
                  onSelect={() => go(`/skills/${s.slug}`)}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm aria-selected:bg-surface-2"
                >
                  <s.icon className="h-4 w-4" />
                  {s.name[locale]}
                </Command.Item>
              ))}
              {skills.length === 0 && (
                <Command.Item
                  value="leads"
                  onSelect={() => go("/skills/leads")}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm aria-selected:bg-surface-2"
                >
                  <Truck className="h-4 w-4" />
                  {locale === "fr" ? "Recherche de transporteurs" : "Carrier lead finder"}
                </Command.Item>
              )}
            </Command.Group>
            <Command.Separator className="my-1 h-px bg-border-subtle" />
            <Command.Group heading={t("app.sidebar.history") + " / " + t("app.sidebar.settings")}>
              <Command.Item
                value="history"
                onSelect={() => go("/history")}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm aria-selected:bg-surface-2"
              >
                <History className="h-4 w-4" />
                {t("app.sidebar.history")}
              </Command.Item>
              <Command.Item
                value="settings"
                onSelect={() => go("/settings")}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm aria-selected:bg-surface-2"
              >
                <SettingsIcon className="h-4 w-4" />
                {t("app.sidebar.settings")}
              </Command.Item>
            </Command.Group>
            <Command.Separator className="my-1 h-px bg-border-subtle" />
            <Command.Group heading={t("settings.language")}>
              <Command.Item
                value="language french fr"
                onSelect={() => switchLang("fr")}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm aria-selected:bg-surface-2"
              >
                <Languages className="h-4 w-4" />
                Français
              </Command.Item>
              <Command.Item
                value="language english en"
                onSelect={() => switchLang("en")}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm aria-selected:bg-surface-2"
              >
                <Languages className="h-4 w-4" />
                English
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
