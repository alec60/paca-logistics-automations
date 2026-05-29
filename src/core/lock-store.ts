// At-rest key derivation for the stored API key.
//
// **No user-facing passcode.** The app no longer prompts for a passcode; App
// applies the embedded COMPANY_PASSCODE automatically on launch. It survives
// only as the password that derives the AES key for the apiKey ciphertext.
//
// Honest threat model:
//   - There is NO access gate. Anyone who can open the app sees everything.
//   - The encryption around the apiKey ciphertext is purely ceremonial —
//     the key is embedded in this source, so anyone with the bundle can
//     derive it. For real protection of sensitive carrier / client data a
//     server-side gate (Cloudflare Worker + token, Supabase RLS, etc.) is
//     required. See DEPLOY.md Part 5.
//
// CryptoKey is held in module-private memory only; refresh clears it and the
// app re-derives it from the embedded passcode on next launch.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  buildVerifier,
  checkVerifier,
  deriveKey,
  randomSalt,
  type Ciphertext,
} from "./crypto";

let memoryKey: CryptoKey | null = null;

export function getLockKey(): CryptoKey | null {
  return memoryKey;
}

/** Embedded password that derives the at-rest key for the API-key ciphertext.
 *  Applied automatically on launch — not a user-facing credential. */
export const COMPANY_PASSCODE = "Camions-Paca-2026";

export interface LockState {
  isInitialized: boolean;
  salt: string | null;
  verifier: Ciphertext | null;
  failedAttempts: number;
  lockoutUntilMs: number | null;

  /** Non-persisted runtime flag — true when memoryKey is set. */
  unlockedAt: number | null;

  /**
   * Single entry point. On first launch (no salt/verifier yet) we accept
   * only the COMPANY_PASSCODE and seed the store. On subsequent unlocks we
   * derive the key from the entered passcode + stored salt and check the
   * verifier.
   */
  unlock: (passcode: string) => Promise<{ ok: boolean; reason?: string }>;
  lock: () => void;
  reset: () => void;
}

const RATE_LIMIT_AFTER = 5;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

export const useLockStore = create<LockState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      salt: null,
      verifier: null,
      failedAttempts: 0,
      lockoutUntilMs: null,
      unlockedAt: null,

      async unlock(passcode) {
        const s = get();
        const now = Date.now();

        if (s.lockoutUntilMs && now < s.lockoutUntilMs) {
          const secLeft = Math.ceil((s.lockoutUntilMs - now) / 1000);
          return { ok: false, reason: `Too many wrong attempts. Try again in ${secLeft}s.` };
        }

        // First-launch initialization: passcode must equal the company one.
        if (!s.isInitialized || !s.salt || !s.verifier) {
          if (passcode !== COMPANY_PASSCODE) {
            return registerFail(s, set, now);
          }
          const salt = randomSalt();
          const key = await deriveKey(passcode, salt);
          const verifier = await buildVerifier(key);
          memoryKey = key;
          set({
            isInitialized: true,
            salt,
            verifier,
            failedAttempts: 0,
            lockoutUntilMs: null,
            unlockedAt: now,
          });
          return { ok: true };
        }

        // Subsequent unlocks: derive from stored salt and verify.
        const key = await deriveKey(passcode, s.salt);
        const ok = await checkVerifier(key, s.verifier);
        if (!ok) return registerFail(s, set, now);

        memoryKey = key;
        set({
          failedAttempts: 0,
          lockoutUntilMs: null,
          unlockedAt: now,
        });
        return { ok: true };
      },

      lock() {
        memoryKey = null;
        set({ unlockedAt: null });
      },

      reset() {
        memoryKey = null;
        set({
          isInitialized: false,
          salt: null,
          verifier: null,
          failedAttempts: 0,
          lockoutUntilMs: null,
          unlockedAt: null,
        });
      },
    }),
    {
      name: "transport-paca-lock",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        isInitialized: s.isInitialized,
        salt: s.salt,
        verifier: s.verifier,
        failedAttempts: s.failedAttempts,
        lockoutUntilMs: s.lockoutUntilMs,
      }),
      onRehydrateStorage: () => () => {
        useLockStore.setState({ unlockedAt: null });
      },
    },
  ),
);

function registerFail(
  s: LockState,
  set: (partial: Partial<LockState>) => void,
  now: number,
): { ok: false; reason: string } {
  const next = s.failedAttempts + 1;
  const shouldLock = next >= RATE_LIMIT_AFTER;
  set({
    failedAttempts: shouldLock ? 0 : next,
    lockoutUntilMs: shouldLock ? now + RATE_LIMIT_COOLDOWN_MS : null,
  });
  return {
    ok: false,
    reason: shouldLock
      ? "Too many wrong attempts. Locked out for 60 seconds."
      : `Wrong passcode. ${RATE_LIMIT_AFTER - next} attempt(s) before lockout.`,
  };
}
