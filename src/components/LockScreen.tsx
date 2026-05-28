// Full-viewport gate shown when the app is locked. There's no "set your own
// passcode" mode — the company passcode in lock-store.ts is the only one
// that opens the install. On successful unlock, decrypts the stored apiKey
// ciphertext into the in-memory runtime-secrets store.
import { useEffect, useState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useLockStore } from "../core/lock-store";
import { useSettingsStore } from "../core/settings-store";
import { useRuntimeSecrets } from "../core/runtime-secrets";

export function LockScreen() {
  const lockoutUntil = useLockStore((s) => s.lockoutUntilMs);
  const failedAttempts = useLockStore((s) => s.failedAttempts);
  const unlock = useLockStore((s) => s.unlock);
  const apiKeyEncrypted = useSettingsStore((s) => s.apiKeyEncrypted);
  const loadFromCiphertext = useRuntimeSecrets((s) => s.loadFromCiphertext);

  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockoutUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const lockedOutFor = lockoutUntil ? Math.max(0, Math.ceil((lockoutUntil - now) / 1000)) : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await unlock(pass);
      if (!result.ok) {
        setError(result.reason ?? "Wrong passcode.");
        return;
      }
      await loadFromCiphertext(apiKeyEncrypted);
      setPass("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md rounded-lg bg-menu-bg p-8 shadow-soft">
        <div className="flex flex-col items-center gap-3 text-center text-input-text">
          <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-gradient-accent shadow-glow">
            <Lock className="h-7 w-7 text-accent-text" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Transport Paca</h1>
          <p className="max-w-sm text-xs text-input-placeholder">
            Entrez le passcode d'équipe pour ouvrir l'application.
          </p>
        </div>

        <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
          <Input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Passcode"
            autoComplete="current-password"
            autoFocus
            disabled={lockedOutFor > 0 || busy}
            aria-label="Passcode"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {lockedOutFor > 0 && (
            <div className="text-center text-xs text-warning">
              Verrouillé. Réessayer dans {lockedOutFor}s.
            </div>
          )}

          {failedAttempts > 0 && lockedOutFor === 0 && (
            <div className="text-center text-[10px] text-input-placeholder">
              {failedAttempts} essai{failedAttempts === 1 ? "" : "s"} échoué{failedAttempts === 1 ? "" : "s"}.
            </div>
          )}

          <Button type="submit" size="lg" disabled={busy || lockedOutFor > 0 || pass.length === 0}>
            {busy ? "…" : "Déverrouiller"}
          </Button>
        </form>
      </div>
    </div>
  );
}
