// Non-persisted store for decrypted secrets (currently just the apiKey).
// Cleared on lock and on refresh. The encrypted ciphertext lives in the
// regular settings-store under `apiKeyEncrypted`.
import { create } from "zustand";
import { decryptString, encryptString, type Ciphertext } from "./crypto";
import { getLockKey } from "./lock-store";

export interface RuntimeSecretsState {
  apiKey: string;
  setApiKeyFromPlain: (plain: string) => Promise<Ciphertext>;
  loadFromCiphertext: (c: Ciphertext | null) => Promise<void>;
  clear: () => void;
}

export const useRuntimeSecrets = create<RuntimeSecretsState>((set) => ({
  apiKey: "",

  async setApiKeyFromPlain(plain) {
    const key = getLockKey();
    if (!key) throw new Error("Locked — cannot store apiKey.");
    const ct = await encryptString(key, plain);
    set({ apiKey: plain });
    return ct;
  },

  async loadFromCiphertext(c) {
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
    } catch {
      set({ apiKey: "" });
    }
  },

  clear() {
    set({ apiKey: "" });
  },
}));
