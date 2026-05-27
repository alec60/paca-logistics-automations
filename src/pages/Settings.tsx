import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useSettingsStore } from "../core/settings-store";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { BlacklistManager } from "../components/BlacklistManager";
import { setMonthlyLimit } from "../core/budget";
import { listSkills } from "../core/skill-registry";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const apiKey = useSettingsStore((s) => s.apiKey);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const monthlyBudgetUsd = useSettingsStore((s) => s.monthlyBudgetUsd);
  const setMonthlyBudgetUsd = useSettingsStore((s) => s.setMonthlyBudgetUsd);
  const devMode = useSettingsStore((s) => s.devMode);
  const setDevMode = useSettingsStore((s) => s.setDevMode);

  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftBudget, setDraftBudget] = useState(monthlyBudgetUsd);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => setDraftKey(apiKey), [apiKey]);
  useEffect(() => setDraftBudget(monthlyBudgetUsd), [monthlyBudgetUsd]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = draftKey.trim();
    const wasEmpty = !apiKey;
    setApiKey(trimmed);
    setMonthlyBudgetUsd(draftBudget);
    try {
      await setMonthlyLimit(draftBudget);
    } catch {
      /* DB may not be ready in non-Tauri dev — store-only fallback is fine */
    }
    setSavedAt(Date.now());

    // If this is first-run (key was empty, now isn't), auto-navigate to the
    // first registered skill so the user lands on something useful.
    if (wasEmpty && trimmed) {
      const skills = listSkills();
      if (skills.length > 0) {
        setTimeout(() => navigate(`/skills/${skills[0].slug}`), 400);
      }
    }
  }

  return (
    <form
      onSubmit={save}
      className="mx-auto flex max-w-3xl flex-col gap-6 p-8"
    >
      <h1 className="text-xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.api_key")}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Clé API Anthropic. Stockée localement, jamais envoyée ailleurs que sur api.anthropic.com. Appuyez sur Entrée ou cliquez sur Enregistrer."
              : "Anthropic API key. Stored locally; never sent anywhere except api.anthropic.com. Press Enter or click Save to confirm."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="apiKey">{t("settings.api_key")}</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder={t("settings.api_key_placeholder")}
              autoComplete="off"
              spellCheck={false}
              // Submit triggers <form onSubmit> via Enter automatically.
            />
            <Button type="submit" disabled={!draftKey.trim() || draftKey.trim() === apiKey}>
              <Check className="h-4 w-4" />
              {locale === "fr" ? "Confirmer" : "Confirm"}
            </Button>
          </div>
          {apiKey && (
            <span className="text-xs text-text-dim">
              {locale === "fr" ? "Clé actuelle : " : "Current key: "}
              <span className="font-mono">…{apiKey.slice(-6)}</span>
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="group" aria-label={t("settings.language")} className="flex gap-2">
            {(["fr", "en"] as const).map((l) => (
              <Button
                key={l}
                type="button"
                variant={locale === l ? "default" : "outline"}
                onClick={() => {
                  setLocale(l);
                  void i18n.changeLanguage(l);
                }}
                aria-pressed={locale === l}
              >
                {l === "fr" ? "Français" : "English"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.budget")}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Limite mensuelle stricte en USD. Les recherches sont bloquées lorsque le plafond est atteint."
              : "Hard monthly limit in USD. Searches are blocked when this is reached."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="budget">{t("settings.budget")}</Label>
          <Input
            id="budget"
            type="number"
            min={1}
            step={1}
            value={draftBudget}
            onChange={(e) => setDraftBudget(Number(e.target.value))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.blacklist")}</CardTitle>
        </CardHeader>
        <CardContent>
          <BlacklistManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.developer")}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Affiche un panneau de diagnostic et la liste des automatisations enregistrées."
              : "Surfaces a diagnostics panel and the registered automations list."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={devMode}
              onChange={(e) => setDevMode(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-accent"
            />
            {t("settings.dev_mode")}
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit">{t("settings.save")}</Button>
        {savedAt && (
          <span className="text-xs text-success">
            ✓{" "}
            {locale === "fr" ? "Enregistré à" : "Saved at"}{" "}
            {new Date(savedAt).toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA")}
          </span>
        )}
      </div>
    </form>
  );
}
