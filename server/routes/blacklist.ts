// Stub — blacklist lives in the frontend SQLite (tauri-plugin-sql).
import { Router } from "express";

export const blacklistRouter = Router();

blacklistRouter.get("/", (_req, res) => {
  res.json({ message: "blacklist lives on the frontend; see core/blacklist.ts" });
});
