import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const apiKey = useSettingsStore((s) => s.apiKey);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const monthlyBudgetUsd = useSettingsStore((s) => s.monthlyBudgetUsd);
  const setMonthlyBudgetUsd = useSettingsStore((s) => s.setMonthlyBudgetUsd);

  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftBudget, setDraftBudget] = useState(monthlyBudgetUsd);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => setDraftKey(apiKey), [apiKey]);
  useEffect(() => setDraftBudget(monthlyBudgetUsd), [monthlyBudgetUsd]);

  async function save() {
    setApiKey(draftKey.trim());
    setMonthlyBudgetUsd(draftBudget);
    try {
      await setMonthlyLimit(draftBudget);
    } catch {
      /* DB may not be ready in non-Tauri dev — store-only fallback is fine */
    }
    setSavedAt(Date.now());
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.api_key")}</CardTitle>
          <CardDescription>
            Anthropic API key. Stored locally; never sent anywhere except api.anthropic.com.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="apiKey">{t("settings.api_key")}</Label>
          <Input
            id="apiKey"
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder={t("settings.api_key_placeholder")}
            autoComplete="off"
            spellCheck={false}
          />
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
            Hard monthly limit in USD. Searches are blocked when this is reached.
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

      <div className="flex items-center gap-3">
        <Button onClick={save}>{t("settings.save")}</Button>
        {savedAt && (
          <span className="text-xs text-text-muted">
            Saved {new Date(savedAt).toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA")}
          </span>
        )}
      </div>
    </div>
  );
}
