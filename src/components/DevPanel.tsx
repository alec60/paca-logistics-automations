// Floating diagnostics panel — only mounted when settings.devMode is on.
// Surfaces registered skills, sidecar status, DB status, budget snapshot,
// app version, build mode, and a quick reset.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Wrench } from "lucide-react";
import { useSettingsStore } from "../core/settings-store";
import { listSkills } from "../core/skill-registry";
import { budgetApi } from "../core/context";
import { getDb } from "../core/db";
import { cn } from "../lib/utils";

interface Diagnostics {
  sidecar: "ok" | "fail" | "unknown";
  db: "ok" | "fail" | "unknown";
  spend: number | null;
  limit: number | null;
}

const APP_VERSION = "0.1.0";
const SIDECAR_URL = "http://127.0.0.1:19191/healthz";

export function DevPanel() {
  const devMode = useSettingsStore((s) => s.devMode);
  const setDevMode = useSettingsStore((s) => s.setDevMode);
  const locale = useSettingsStore((s) => s.locale);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const reset = useSettingsStore((s) => s.reset);
  const [open, setOpen] = useState(true);
  const [diag, setDiag] = useState<Diagnostics>({
    sidecar: "unknown",
    db: "unknown",
    spend: null,
    limit: null,
  });

  const skills = useMemo(() => listSkills(), []);
  const tauriDetected = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  const mode = import.meta.env.MODE;

  useEffect(() => {
    if (!devMode) return;
    let alive = true;

    async function probe() {
      // sidecar
      try {
        const res = await fetch(SIDECAR_URL, { method: "GET" });
        if (alive) setDiag((d) => ({ ...d, sidecar: res.ok ? "ok" : "fail" }));
      } catch {
        if (alive) setDiag((d) => ({ ...d, sidecar: "fail" }));
      }
      // db + budget
      try {
        await getDb();
        const [spend, limit] = await Promise.all([
          budgetApi.getCurrentSpend(),
          budgetApi.getMonthlyLimit(),
        ]);
        if (alive) setDiag((d) => ({ ...d, db: "ok", spend, limit }));
      } catch {
        if (alive) setDiag((d) => ({ ...d, db: "fail" }));
      }
    }
    void probe();
    const id = setInterval(probe, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [devMode]);

  if (!devMode) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 flex w-80 flex-col items-end">
      <div
        className={cn(
          "pointer-events-auto flex w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-1 font-mono text-[11px] shadow-lg",
          open ? "" : "max-h-[34px]",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between gap-2 border-b border-border-subtle bg-surface-2 px-3 py-1.5 text-text"
        >
          <span className="inline-flex items-center gap-1.5">
            <Wrench className="h-3 w-3 text-accent" />
            {locale === "fr" ? "Mode développeur" : "Dev panel"}
          </span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>

        {open && (
          <div className="flex flex-col gap-2 p-3 text-text-muted">
            <Row label="version" value={APP_VERSION} />
            <Row label="mode" value={mode} />
            <Row label="tauri" value={tauriDetected ? "yes" : "no (browser)"} />
            <Row
              label="locale"
              value={locale}
            />
            <Row
              label="apiKey"
              value={apiKey ? `…${apiKey.slice(-6)}` : "(unset)"}
            />
            <Row
              label="sidecar"
              value={diag.sidecar}
              tone={diag.sidecar === "ok" ? "good" : diag.sidecar === "fail" ? "bad" : "muted"}
            />
            <Row
              label="db"
              value={diag.db}
              tone={diag.db === "ok" ? "good" : diag.db === "fail" ? "bad" : "muted"}
            />
            <Row
              label="spend"
              value={
                diag.spend != null && diag.limit != null
                  ? `$${diag.spend.toFixed(2)} / $${diag.limit.toFixed(0)}`
                  : "—"
              }
            />

            <div className="mt-2 border-t border-border-subtle pt-2">
              <div className="mb-1 text-text-dim">
                {locale === "fr" ? "Automatisations enregistrées" : "Registered automations"} ({skills.length})
              </div>
              {skills.length === 0 ? (
                <div className="text-danger">
                  {locale === "fr"
                    ? "Aucune automatisation chargée — vérifier import.meta.glob"
                    : "No skills loaded — check import.meta.glob"}
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {skills.map((s) => (
                    <li key={s.slug} className="text-text">
                      <span className="text-accent">{s.slug}</span>{" "}
                      <span className="text-text-dim">— {s.name[locale]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-2 flex gap-2 border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={() => setDevMode(false)}
                className="rounded border border-border-subtle px-2 py-1 hover:bg-surface-2"
              >
                {locale === "fr" ? "Désactiver" : "Disable"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      locale === "fr"
                        ? "Réinitialiser tous les paramètres locaux ? Cela effacera la clé API."
                        : "Reset all local settings? This clears the API key.",
                    )
                  ) {
                    reset();
                  }
                }}
                className="rounded border border-danger/40 px-2 py-1 text-danger hover:bg-danger/10"
              >
                {locale === "fr" ? "Réinitialiser" : "Reset"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "good" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : "text-text";
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-dim">{label}</span>
      <span className={toneClass}>{value}</span>
    </div>
  );
}
