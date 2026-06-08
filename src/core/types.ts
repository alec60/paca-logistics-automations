import type { LucideIcon } from "lucide-react";
import type { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

export type Locale = "en" | "fr";

export interface BlacklistEntry {
  id: number;
  company: string;
  reason?: string;
  created_at: string;
}

export interface BlacklistAPI {
  list(): Promise<BlacklistEntry[]>;
  add(company: string, reason?: string): Promise<void>;
  remove(id: number): Promise<void>;
  isBlacklisted(company: string): Promise<boolean>;
  filterCarriers<T extends { company: string }>(carriers: T[]): Promise<T[]>;
}

export interface BudgetAPI {
  getMonthlyLimit(): Promise<number>;
  getCurrentSpend(): Promise<number>;
  getPercentUsed(): Promise<number>;
  canAffordEstimate(estimateUsd: number): Promise<{ ok: boolean; reason?: string }>;
  logSpend(usd: number, skillSlug: string, meta?: object): Promise<void>;
}

export interface SkillContext {
  claude: Anthropic;
  db: unknown; // tauri-plugin-sql Database instance
  blacklist: BlacklistAPI;
  budget: BudgetAPI;
  log: (msg: string) => void;
  locale: Locale;
}

export interface SkillManifest<Params, Result> {
  slug: string;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  icon: LucideIcon;
  // Use ZodTypeAny so handlers may apply .default() to optional fields without
  // a Params/Input mismatch. Output is validated at the call site.
  paramsSchema: z.ZodTypeAny;
  resultSchema: z.ZodTypeAny;
  ParamView: React.FC<{
    onSubmit: (p: Params) => void;
    defaultValues?: Partial<Params>;
  }>;
  ResultView: React.FC<{
    result: Result;
    onNewSearch: () => void;
    params: Params;
  }>;
  handler: (params: Params, ctx: SkillContext) => Promise<Result>;
}

export class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetError";
  }
}

export class RateLimitError extends Error {
  retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** The model's response couldn't be parsed into the expected result shape
 *  (e.g. it returned prose instead of JSON, or the JSON was truncated). The
 *  raw text is kept for console diagnostics; `message` stays user-friendly. */
export class ModelOutputError extends Error {
  raw?: string;
  constructor(message: string, raw?: string) {
    super(message);
    this.name = "ModelOutputError";
    this.raw = raw;
  }
}
