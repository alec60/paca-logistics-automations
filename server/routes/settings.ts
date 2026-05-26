// Stub — the frontend owns settings (Zustand + Tauri-FS-backed in Phase 5).
// Kept so the file structure matches the spec and a future server-side
// migration is one-PR away.
import { Router } from "express";

export const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
  res.json({ message: "settings live on the frontend; see core/settings-store.ts" });
});
