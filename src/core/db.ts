import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:transport-paca.db");
  }
  return dbPromise;
}

// Test helper — swap a mock in unit tests.
export function __setTestDb(p: Promise<Database> | null) {
  dbPromise = p;
}
