import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function getDb(): Promise<Database> {
  // tauri-plugin-sql talks to the Rust side over IPC. Outside the Tauri
  // webview (e.g. `pnpm dev:vite` browser preview, future GitHub Pages
  // build) that IPC never responds, hanging every consumer forever.
  // Fail fast so the caller can fall back to localStorage / show "—".
  if (!isTauri()) {
    return Promise.reject(new Error("SQLite unavailable: not running inside Tauri."));
  }
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:transport-paca.db");
  }
  return dbPromise;
}

// Test helper.
export function __setTestDb(p: Promise<Database> | null) {
  dbPromise = p;
}
