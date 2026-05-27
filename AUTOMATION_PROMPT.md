# Master prompt — adding a new automation to Transport Paca

> Copy-paste **everything below the line** into a fresh Claude Code session whose only job is to add one new automation. The chat does not need any extra context — this file plus the repo's `AGENTS.md`, `CLAUDE.md`, and `FEATURES.md` are everything.

---

You are extending the **Transport Paca** desktop app (Tauri 2 + React 18 + TypeScript + Tailwind v4). The scaffold is shipped. Your only job is to add **one** new automation as a self-contained "block" in `src/skills/<slug>/`. The skill registry auto-discovers it via `import.meta.glob` — you do not edit the router, sidebar, or registry.

## 0. Read these files (in this order)

1. `FEATURES.md` — what already exists. **You will append to this file at the end.**
2. `AGENTS.md` — architecture, signing-key location, public-repo safety rules.
3. `CLAUDE.md` — conventions, naming, file-size cap (500 lines).
4. `src/skills/leads/` — the **reference implementation**. Mirror its structure exactly.

## 1. Clarify the automation with the user (one short paragraph)

Ask in plain language:
- What does the automation produce? (a list of X, a report on Y, an email draft, …)
- What are the inputs?
- Does it call Anthropic? Does it need `web_search` or another tool?
- Does the result include companies? (If yes, you must run `ctx.blacklist.filterCarriers()`.)
- Estimated cost per run? (For the budget pre-check.)

Lock the answers before writing code.

## 2. Implement the block

Pick a kebab-case slug (e.g. `quote-generator`, `email-outreach`, `carrier-deep-dive`).

```bash
cp -r src/skills/leads src/skills/<slug>
```

Then edit each file:

| File | What changes |
|---|---|
| `manifest.ts` | `slug`, bilingual `name`, bilingual `description`, lucide `icon`, wire schemas/views/handler. Default export. |
| `schemas.ts` | Zod `<Slug>Params` and `<Slug>Result`. Strict. Validate at every boundary. |
| `prompt.ts` | `buildMessagesRequest(params, locale)` → `Anthropic.MessageCreateParams`. Add system prompt + tools. |
| `handler.ts` | `ctx.budget.canAffordEstimate(estimate)` → `callSidecar` → extract JSON → `Schema.parse` → optional `ctx.blacklist.filterCarriers` → compute real cost → `ctx.budget.logSpend(cost, "<slug>", { params })` → persist to `search_history`. |
| `ParamView.tsx` | Input form. **Tailwind utilities only — no hardcoded hex.** Use `ChipInput`, `PillGroup`, shadcn `Button`/`Input` from `src/components/`. |
| `ResultView.tsx` | Output table/cards. Use `ResultTable`, `CostBadge`, `EmptyState`. |
| `data.ts` *(optional)* | Static reference data (lists, enums, etc.). |
| `i18n/{en,fr}.json` | Every user-visible string. **French translation is mandatory.** |

## 3. Tests

Add at minimum:

```
tests/unit/<slug>-schemas.test.ts   # Zod params + result validation, edge cases
tests/e2e/<slug>.spec.ts            # Playwright: ParamView renders, fields visible
```

Run:
```bash
pnpm typecheck && pnpm lint && pnpm test
```

All three must pass before committing.

## 4. **Update `FEATURES.md`** — REQUIRED

Append a new entry at the **bottom of the `## Automations` section** using the format in `FEATURES.md`:

```markdown
### <slug>

- **Type:** automation
- **Added:** YYYY-MM-DD
- **Status:** shipped
- **Description:** One sentence.
- **Inputs:** comma-separated list
- **Output:** the Zod result-schema shape
- **Files touched:** `src/skills/<slug>/...`
- **Notes:** anything weird, dependencies, future work
```

This step is non-negotiable. Future sessions and the dev-mode panel rely on it.

## 5. Update `CHANGELOG.md`

Add a bullet under `## [Unreleased]` → `### Added`. Format: `- <slug>: <one-sentence description>`.

## 6. Commit

```bash
git add -A
git commit -m "feat: <slug> automation"
```

Do **not** tag or push. Tell the user the slug, what to test, and where it lives. The user will tag + push when they're ready.

## 7. Hand off — final message must include

1. The slug.
2. A 2-line "what it does" summary.
3. **Run instructions:** "Open the app, press Ctrl+K, search '<slug>'" or "click '<localized name>' in the sidebar".
4. Anything blocking deploy (missing key, env var, secret).

## Hard rules

- **NEVER** commit real carrier names, phone numbers, emails, addresses, client names, prices, margins, quote data, team members' real names, or API keys (even revoked).
- **NEVER** hardcode colors — use design tokens (`bg-surface-1`, `text-accent`, etc.) from `src/index.css @theme`.
- **NEVER** skip the `ctx.budget.canAffordEstimate()` pre-check if the handler calls Anthropic.
- **NEVER** skip the `ctx.blacklist.filterCarriers()` post-filter if the result contains companies.
- **NEVER** create a file over 500 lines. Split it.
- **NEVER** edit `src/core/skill-registry.ts`, `src/router.tsx`, or `src/components/Sidebar.tsx` — auto-discovery handles wiring.
- **ALWAYS** validate every external response (Anthropic, sidecar, DB) with Zod at the boundary.
- **ALWAYS** include both `en` and `fr` translations.
- **ALWAYS** append to `FEATURES.md` before committing.

That's it. Ship the block, update the registry, tell the user. 200 lines of code, maybe 300.
