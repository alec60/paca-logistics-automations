// Stub — budget tracking lives in the frontend SQLite (tauri-plugin-sql).
import { Router } from "express";

export const budgetRouter = Router();

budgetRouter.get("/", (_req, res) => {
  res.json({ message: "budget lives on the frontend; see core/budget.ts" });
});
