// WebCrypto helpers for the app's passcode lock.
//
// Threat model:
// - Attacker has read access to the user's localStorage (e.g. someone with
//   physical access to the unlocked machine or who pulled a backup).
// - The passcode itself is never persisted — only a salt + a verifier blob.
// - The CryptoKey is held in memory only and discarded on lock / restart.
//
// PBKDF2 200k iterations (OWASP 2023 floor for SHA-256). AES-GCM 256.
// All persisted ciphertext is shaped `{ iv: b64, ct: b64 }`.

const PBKDF2_ITER = 200_000;
const KEY_LEN = 256;

export function randomSalt(): string {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return bufToB64(arr.buffer);
}

export async function deriveKey(passcode: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64ToBuf(saltB64),
      iterations: PBKDF2_ITER,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LEN },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface Ciphertext {
  iv: string;
  ct: string;
}

export async function encryptString(key: CryptoKey, plaintext: string): Promise<Ciphertext> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { iv: bufToB64(iv.buffer), ct: bufToB64(ct) };
}

export async function decryptString(key: CryptoKey, c: Ciphertext): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(c.iv) },
    key,
    b64ToBuf(c.ct),
  );
  return new TextDecoder().decode(plaintext);
}

// ─────────── base64 helpers ───────────

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return btoa(bin);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// ─────────── verifier ───────────

// A known plaintext encrypted with the derived key. On unlock we attempt to
// decrypt this — if AES-GCM tag verification passes AND the plaintext matches
// the expected sentinel, the passcode was correct.
export const VERIFIER_PLAINTEXT = "transport-paca-ok";

export async function buildVerifier(key: CryptoKey): Promise<Ciphertext> {
  return encryptString(key, VERIFIER_PLAINTEXT);
}

export async function checkVerifier(key: CryptoKey, c: Ciphertext): Promise<boolean> {
  try {
    const pt = await decryptString(key, c);
    return pt === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}
