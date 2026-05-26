// Dynamic skill view — picks the manifest from skill-registry by :slug and
// renders ParamView → handler → ResultView.
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { findSkill } from "../core/skill-registry";
import { useSettingsStore } from "../core/settings-store";
import { blacklistApi, budgetApi } from "../core/context";
import { getDb } from "../core/db";
import type { SkillContext, SkillManifest } from "../core/types";
import { BudgetError } from "../core/types";

type AnyManifest = SkillManifest<unknown, unknown>;

export function SkillRunner() {
  const { slug = "" } = useParams();
  const { t } = useTranslation();
  const apiKey = useSettingsStore((s) => s.apiKey);
  const locale = useSettingsStore((s) => s.locale);

  const skill = findSkill(slug) as AnyManifest | undefined;
  const [params, setParams] = useState<unknown>(null);
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (p: unknown) => {
      if (!skill) return;
      setParams(p);
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const db = await getDb().catch(() => null);
        const ctx: SkillContext & { apiKey: string } = {
          claude: null as never, // skill handlers call the sidecar themselves
          db,
          blacklist: blacklistApi,
          budget: budgetApi,
          log: (m) => console.log(`[skill:${skill.slug}]`, m),
          locale,
          apiKey,
        };
        const out = await skill.handler(p, ctx);
        setResult(out);
      } catch (err) {
        if (err instanceof BudgetError) {
          setError(err.message);
        } else {
          setError((err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    },
    [skill, apiKey, locale],
  );

  if (!skill) {
    return <div className="p-8 text-text-muted">Unknown skill: {slug}</div>;
  }

  if (loading) {
    return <div className="p-8 text-text-muted">{t("common.loading")}</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded border border-danger bg-surface-1 p-4 text-sm text-danger">
          {error}
        </div>
      </div>
    );
  }

  if (result && params !== null) {
    const ResultView = skill.ResultView;
    return (
      <ResultView
        result={result}
        params={params}
        onNewSearch={() => {
          setResult(null);
          setParams(null);
        }}
      />
    );
  }

  const ParamView = skill.ParamView;
  return (
    <ParamView
      onSubmit={onSubmit}
      defaultValues={(params as Record<string, unknown> | undefined) ?? undefined}
    />
  );
}
