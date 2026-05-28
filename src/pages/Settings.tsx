import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Plug, AlertTriangle, Download, Upload, KeyRound } from "lucide-react";
import { useSettingsStore } from "../core/settings-store";
import { useRuntimeSecrets } from "../core/runtime-secrets";
import { useLockStore } from "../core/lock-store";
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
import { setMonthlyLimit } from "../core/budget";
import { listSkills } from "../core/skill-registry";
import { testApiKey, type TestKeyResult } from "../core/claude-client";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const apiKey = useRuntimeSecrets((s) => s.apiKey);
  const setApiKeyFromPlain = useRuntimeSecrets((s) => s.setApiKeyFromPlain);
  const setApiKeyEncrypted = useSettingsStore((s) => s.setApiKeyEncrypted);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const monthlyBudgetUsd = useSettingsStore((s) => s.monthlyBudgetUsd);
  const setMonthlyBudgetUsd = useSettingsStore((s) => s.setMonthlyBudgetUsd);
  const devMode = useSettingsStore((s) => s.devMode);
  const setDevMode = useSettingsStore((s) => s.setDevMode);
  const exportSnapshot = useSettingsStore((s) => s.exportSnapshot);
  const importSnapshot = useSettingsStore((s) => s.importSnapshot);
  const changePasscode = useLockStore((s) => s.changePasscode);

  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftBudget, setDraftBudget] = useState(monthlyBudgetUsd);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestKeyResult | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraftKey(apiKey), [apiKey]);
  useEffect(() => setDraftBudget(monthlyBudgetUsd), [monthlyBudgetUsd]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = draftKey.trim();
    const wasEmpty = !apiKey;
    if (trimmed && trimmed !== apiKey) {
      try {
        const ct = await setApiKeyFromPlain(trimmed);
        setApiKeyEncrypted(ct);
      } catch (err) {
        setSavedAt(null);
        // Likely locked — should not happen since lock screen gates this page.
        console.error(err);
      }
    }
    setMonthlyBudgetUsd(draftBudget);
    try {
      await setMonthlyLimit(draftBudget);
    } catch {
      /* DB may not be ready in non-Tauri dev — store-only fallback is fine */
    }
    setSavedAt(Date.now());

    if (wasEmpty && trimmed) {
      const skills = listSkills();
      if (skills.length > 0) {
        setTimeout(() => navigate(`/skills/${skills[0].slug}`), 400);
      }
    }
  }

  async function testKey() {
    const key = draftKey.trim() || apiKey;
    if (!key) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testApiKey(key);
      setTestResult(r);
    } catch (err) {
      setTestResult({
        ok: false,
        error:
          (err as Error).message +
          " — the sidecar isn't reachable. Make sure `pnpm dev` is running both Vite and the sidecar.",
      });
    } finally {
      setTesting(false);
    }
  }

  function doExport(opts: { includeSecrets: boolean; includeHistory: boolean }) {
    if (opts.includeSecrets) {
      const proceed = window.confirm(
        locale === "fr"
          ? "Cet export contient votre clé API CHIFFRÉE et l'historique des recherches. " +
              "Quelqu'un qui obtient ce fichier ET votre passcode peut récupérer la clé. " +
              "Ne le partagez qu'avec des coéquipiers de confiance, jamais sur un canal public. Continuer ?"
          : "This export contains your ENCRYPTED API key and search history. " +
              "Anyone who gets this file AND your passcode can recover the key. " +
              "Only share with trusted teammates, never on a public channel. Continue?",
      );
      if (!proceed) return;
    }
    const json = exportSnapshot(opts);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = opts.includeSecrets ? "-full" : "-safe";
    a.download = `transport-paca-settings${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importSnapshot(String(reader.result));
        setImportMsg("Imported. Refresh to apply.");
      } catch (err) {
        setImportMsg(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-selecting the same file
  }

  async function doChangePasscode(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);
    const r = await changePasscode(oldPass, newPass);
    if (r.ok) {
      setPassMsg("Passcode updated.");
      setOldPass("");
      setNewPass("");
    } else {
      setPassMsg(r.reason ?? "Change failed.");
    }
  }

  const keyShapeWarn =
    draftKey.trim().length > 0 && !draftKey.trim().startsWith("sk-ant-");

  return (
    <form onSubmit={save} className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.api_key")}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Clé API Anthropic. Chiffrée localement avec votre passcode (AES-GCM 256). À l'usage, la clé est confiée au composant local de l'application (sidecar 127.0.0.1) qui appelle api.anthropic.com pour vous."
              : "Anthropic API key. Encrypted locally with your passcode (AES-GCM 256). At call time, the key is held by the app's local component (sidecar 127.0.0.1) which calls api.anthropic.com on your behalf."}
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
            />
            <Button type="submit" disabled={!draftKey.trim() || draftKey.trim() === apiKey}>
              <Check className="h-4 w-4" />
              {locale === "fr" ? "Confirmer" : "Confirm"}
            </Button>
          </div>
          {apiKey && (
            <span className="text-xs text-text-dim">
              {locale === "fr" ? "Clé actuelle : " : "Current key: "}
              <span className="font-mono">
                {apiKey.slice(0, 8)}…{apiKey.slice(-6)} ({apiKey.length}{" "}
                {locale === "fr" ? "car." : "chars"})
              </span>
            </span>
          )}

          {keyShapeWarn && (
            <div className="flex items-start gap-2 rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {locale === "fr"
                  ? "Cette clé ne commence pas par « sk-ant- ». Les clés API Anthropic proviennent de console.anthropic.com, PAS de claude.ai."
                  : "This key doesn't start with 'sk-ant-'. Anthropic API keys come from console.anthropic.com, NOT claude.ai."}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testKey}
              disabled={testing || (!draftKey.trim() && !apiKey)}
            >
              <Plug className="h-3.5 w-3.5" />
              {testing
                ? locale === "fr"
                  ? "Test en cours…"
                  : "Testing…"
                : locale === "fr"
                  ? "Tester la clé"
                  : "Test API key"}
            </Button>
            {testResult && (
              <span className={"text-xs " + (testResult.ok ? "text-success" : "text-danger")}>
                {testResult.ok
                  ? `✓ ${locale === "fr" ? "Clé valide" : "Key works"} — ${testResult.model}`
                  : `✗ ${testResult.status ?? ""} ${testResult.error}`}
              </span>
            )}
          </div>
          {testResult && !testResult.ok && testResult.hint && (
            <div className="rounded border border-border-subtle bg-surface-2 p-2 text-xs text-text-muted">
              {testResult.hint}
            </div>
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
          <CardTitle>
            <KeyRound className="mr-2 inline h-4 w-4" />
            {locale === "fr" ? "Passcode" : "Passcode"}
          </CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Changer le passcode utilisé pour déchiffrer cette installation."
              : "Change the passcode that unlocks this install."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row" onClick={(e) => e.stopPropagation()}>
            <Input
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              placeholder={locale === "fr" ? "Passcode actuel" : "Current passcode"}
              autoComplete="current-password"
            />
            <Input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder={locale === "fr" ? "Nouveau passcode" : "New passcode"}
              autoComplete="new-password"
            />
            <Button type="button" onClick={doChangePasscode}>
              {locale === "fr" ? "Mettre à jour" : "Update"}
            </Button>
          </div>
          {passMsg && (
            <div
              className={
                "mt-2 text-xs " + (passMsg === "Passcode updated." ? "text-success" : "text-danger")
              }
            >
              {passMsg}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{locale === "fr" ? "Sauvegarde / partage" : "Backup / share"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Exporter ou importer l'état complet (clé chiffrée, épingles, historique). La synchronisation en temps réel nécessite un backend — non encore implémenté."
              : "Export or import the full state (encrypted key, pins, history). Real-time sync needs a backend — not yet wired."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => doExport({ includeSecrets: false, includeHistory: false })}
          >
            <Download className="h-4 w-4" />
            {locale === "fr" ? "Exporter (préférences seulement)" : "Export (preferences only)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => doExport({ includeSecrets: true, includeHistory: true })}
          >
            <Download className="h-4 w-4" />
            {locale === "fr" ? "Exporter tout (avec clé + historique)" : "Export everything (key + history)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {locale === "fr" ? "Importer JSON" : "Import JSON"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImportFile}
          />
          {importMsg && (
            <span
              className={
                "text-xs " + (importMsg.startsWith("Import failed") ? "text-danger" : "text-success")
              }
            >
              {importMsg}
            </span>
          )}
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
            ✓ {locale === "fr" ? "Enregistré à" : "Saved at"}{" "}
            {new Date(savedAt).toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA")}
          </span>
        )}
      </div>
    </form>
  );
}
