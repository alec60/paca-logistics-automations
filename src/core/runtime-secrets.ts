// Non-persisted store for decrypted secrets (apiKey + sidecar session state).
// Cleared on lock and on refresh. The encrypted ciphertext lives in the
// regular settings-store under `apiKeyEncrypted`.
//
// On unlock the apiKey is decrypted and immediately registered with the local
// sidecar via /api/auth/register. From then on the renderer holds only the
// session token (in this store) and the plaintext key (used solely to
// re-register if the session expires or the sidecar restarts).
import { create } from "zustand";
import { decryptString, encryptString, type Ciphertext } from "./crypto";
import { getLockKey } from "./lock-store";
import { logoutSession, registerSession } from "./claude-client";

export interface RuntimeSecretsState {
  apiKey: string;
  sessionRegistered: boolean;
  setApiKeyFromPlain: (plain: string) => Promise<Ciphertext>;
  loadFromCiphertext: (c: Ciphertext | null) => Promise<void>;
  clear: () => Promise<void>;
}

export const useRuntimeSecrets = create<RuntimeSecretsState>((set, get) => ({
  apiKey: "",
  sessionRegistered: false,

  async setApiKeyFromPlain(plain) {
    const key = getLockKey();
    if (!key) throw new Error("Locked — cannot store apiKey.");
    const ct = await encryptString(key, plain);
    set({ apiKey: plain });
    try {
      await registerSession(plain);
      set({ sessionRegistered: true });
    } catch {
      set({ sessionRegistered: false });
    }
    return ct;
  },

  async loadFromCiphertext(c) {
    // Tear down any prior session before swapping keys.
    if (get().sessionRegistered) {
      await logoutSession();
      set({ sessionRegistered: false });
    }
    if (!c) {
      set({ apiKey: "" });
      return;
    }
    const key = getLockKey();
    if (!key) {
      set({ apiKey: "" });
      return;
    }
    try {
      const plain = await decryptString(key, c);
      set({ apiKey: plain });
      try {
        await registerSession(plain);
        set({ sessionRegistered: true });
      } catch {
        set({ sessionRegistered: false });
      }
    } catch {
      set({ apiKey: "" });
    }
  },

  async clear() {
    if (get().sessionRegistered) await logoutSession();
    set({ apiKey: "", sessionRegistered: false });
  },
}));
