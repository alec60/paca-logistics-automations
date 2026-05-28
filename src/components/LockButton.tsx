// Small header button that re-locks the app — clears the in-memory CryptoKey
// and the decrypted apiKey. Next interaction shows LockScreen.
import { LockKeyhole } from "lucide-react";
import { useLockStore } from "../core/lock-store";
import { useRuntimeSecrets } from "../core/runtime-secrets";

export function LockButton() {
  const lock = useLockStore((s) => s.lock);
  const clearSecrets = useRuntimeSecrets((s) => s.clear);

  function onClick() {
    clearSecrets();
    lock();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lock"
      title="Lock"
      className="flex h-8 w-8 items-center justify-center rounded-pill border border-border-subtle bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text"
    >
      <LockKeyhole className="h-4 w-4" />
    </button>
  );
}
