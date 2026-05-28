// Lock-screen state. Persists isInitialized + salt + verifier ciphertext.
// CryptoKey is in-memory only and re-derived on unlock.
//
// Rate limiting: 5 wrong attempts → 60-second cooldown. Resets on success.
//
// Once unlocked, the key is held in module-private memory (NOT in the Zustand
// store, because we never want it serialized to localStorage). Other modules
// (runtime-secrets, encrypted helpers) call getLockKey() to fetch it.
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

export interface LockState {
  isInitialized: boolean;
  salt: string | null;
  verifier: Ciphertext | null;
  failedAttempts: number;
  lockoutUntilMs: number | null;

  // Non-persisted runtime flag — true when memoryKey is set.
  unlockedAt: number | null;

  setup: (passcode: string) => Promise<void>;
  unlock: (passcode: string) => Promise<{ ok: boolean; reason?: string }>;
  lock: () => void;
  changePasscode: (oldP: string, newP: string) => Promise<{ ok: boolean; reason?: string }>;
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

      async setup(passcode) {
        if (passcode.length < 6) {
          throw new Error("Passcode must be at least 6 characters.");
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
          unlockedAt: Date.now(),
        });
      },

      async unlock(passcode) {
        const s = get();
        const now = Date.now();
        if (s.lockoutUntilMs && now < s.lockoutUntilMs) {
          const secLeft = Math.ceil((s.lockoutUntilMs - now) / 1000);
          return { ok: false, reason: `Too many wrong attempts. Try again in ${secLeft}s.` };
        }
        if (!s.salt || !s.verifier) {
          return { ok: false, reason: "Lock not initialized. Refresh the page." };
        }
        const key = await deriveKey(passcode, s.salt);
        const ok = await checkVerifier(key, s.verifier);
        if (!ok) {
          const next = s.failedAttempts + 1;
          const shouldLock = next >= RATE_LIMIT_AFTER;
          set({
            failedAttempts: shouldLock ? 0 : next,
            lockoutUntilMs: shouldLock ? now + RATE_LIMIT_COOLDOWN_MS : null,
          });
          return {
            ok: false,
            reason: shouldLock
              ? `Wrong passcode. Locked out for 60 seconds.`
              : `Wrong passcode. ${RATE_LIMIT_AFTER - next} attempt(s) before lockout.`,
          };
        }
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

      async changePasscode(oldP, newP) {
        const s = get();
        if (newP.length < 6) {
          return { ok: false, reason: "New passcode must be at least 6 characters." };
        }
        if (!s.salt || !s.verifier) {
          return { ok: false, reason: "Lock not initialized." };
        }
        const oldKey = await deriveKey(oldP, s.salt);
        const ok = await checkVerifier(oldKey, s.verifier);
        if (!ok) return { ok: false, reason: "Current passcode is wrong." };
        const newSalt = randomSalt();
        const newKey = await deriveKey(newP, newSalt);
        const newVerifier = await buildVerifier(newKey);
        memoryKey = newKey;
        set({ salt: newSalt, verifier: newVerifier, unlockedAt: Date.now() });
        return { ok: true };
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
      // unlockedAt is runtime-only; failedAttempts persists so a refresh
      // doesn't reset the brute-force counter mid-lockout.
      partialize: (s) => ({
        isInitialized: s.isInitialized,
        salt: s.salt,
        verifier: s.verifier,
        failedAttempts: s.failedAttempts,
        lockoutUntilMs: s.lockoutUntilMs,
      }),
      onRehydrateStorage: () => () => {
        // After hydration from localStorage, memoryKey is null — user must
        // unlock again. Force unlockedAt = null to be safe.
        useLockStore.setState({ unlockedAt: null });
      },
    },
  ),
);

// Suggested default. Surfaced once during first-launch setup; if the user
// keeps it, that's their choice. The committed default is just a UX hint —
// the actual hash + salt is unique per install.
export const SUGGESTED_PASSCODE = "Camions-Paca-2026";
