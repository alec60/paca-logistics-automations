// Full-viewport gate shown when the app is locked.
// Two modes:
//   - setup (no passcode set yet): show suggested default + confirm field
//   - unlock (passcode set, key cleared): show single passcode field
//
// On successful unlock, decrypts the stored apiKey ciphertext into the
// in-memory runtime-secrets store.
import { useEffect, useState } from "react";
import { Lock, KeyRound, AlertCircle, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useLockStore, SUGGESTED_PASSCODE } from "../core/lock-store";
import { useSettingsStore } from "../core/settings-store";
import { useRuntimeSecrets } from "../core/runtime-secrets";

export function LockScreen() {
  const isInitialized = useLockStore((s) => s.isInitialized);
  const lockoutUntil = useLockStore((s) => s.lockoutUntilMs);
  const failedAttempts = useLockStore((s) => s.failedAttempts);
  const setup = useLockStore((s) => s.setup);
  const unlock = useLockStore((s) => s.unlock);
  const apiKeyEncrypted = useSettingsStore((s) => s.apiKeyEncrypted);
  const loadFromCiphertext = useRuntimeSecrets((s) => s.loadFromCiphertext);

  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
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
      if (!isInitialized) {
        if (pass.length < 6) {
          setError("Passcode must be at least 6 characters.");
          return;
        }
        if (pass !== confirm) {
          setError("Passcode and confirmation don't match.");
          return;
        }
        await setup(pass);
        // First-launch — no existing apiKey ciphertext to load.
        await loadFromCiphertext(apiKeyEncrypted);
      } else {
        const result = await unlock(pass);
        if (!result.ok) {
          setError(result.reason ?? "Wrong passcode.");
          return;
        }
        await loadFromCiphertext(apiKeyEncrypted);
      }
      setPass("");
      setConfirm("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function useSuggested() {
    setPass(SUGGESTED_PASSCODE);
    setConfirm(SUGGESTED_PASSCODE);
  }

  async function copySuggested() {
    try {
      await navigator.clipboard.writeText(SUGGESTED_PASSCODE);
    } catch {
      /* ignore — clipboard may be unavailable */
    }
  }

  const mode: "setup" | "unlock" = isInitialized ? "unlock" : "setup";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-1 p-8 shadow-soft">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-gradient-accent shadow-glow">
            {mode === "setup" ? (
              <KeyRound className="h-7 w-7 text-accent-text" />
            ) : (
              <Lock className="h-7 w-7 text-accent-text" />
            )}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "setup" ? "Set a passcode" : "Unlock Transport Paca"}
          </h1>
          <p className="max-w-sm text-xs text-text-muted">
            {mode === "setup"
              ? "Choose a passcode to protect this install. Your API key and settings will be encrypted at rest with a key derived from this passcode. If you forget it, the data is unrecoverable."
              : "Enter your passcode to decrypt local settings and continue."}
          </p>
        </div>

        <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
          {mode === "setup" && (
            <div className="rounded-md border border-border-subtle bg-surface-2 p-3 text-xs">
              <div className="font-medium text-text">Suggested passcode</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="font-mono text-accent">{SUGGESTED_PASSCODE}</code>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={copySuggested}
                    title="Copy"
                    className="rounded-pill p-1 text-text-muted hover:bg-surface-3 hover:text-text"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={useSuggested}
                    className="rounded-pill border border-border-subtle px-2 py-0.5 text-[10px] hover:bg-surface-3"
                  >
                    Use this
                  </button>
                </div>
              </div>
              <div className="mt-2 text-text-dim">
                Or pick your own — anything ≥ 6 characters.
              </div>
            </div>
          )}

          <Input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={mode === "setup" ? "New passcode" : "Passcode"}
            autoComplete={mode === "setup" ? "new-password" : "current-password"}
            autoFocus
            disabled={lockedOutFor > 0 || busy}
            aria-label="Passcode"
          />

          {mode === "setup" && (
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm passcode"
              autoComplete="new-password"
              disabled={busy}
              aria-label="Confirm passcode"
            />
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {lockedOutFor > 0 && (
            <div className="text-center text-xs text-warning">
              Locked out. Retry in {lockedOutFor}s.
            </div>
          )}

          {failedAttempts > 0 && lockedOutFor === 0 && (
            <div className="text-center text-[10px] text-text-dim">
              {failedAttempts} failed attempt{failedAttempts === 1 ? "" : "s"} so far.
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={busy || lockedOutFor > 0 || pass.length === 0}
          >
            {busy
              ? "Working…"
              : mode === "setup"
                ? "Set passcode & unlock"
                : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
