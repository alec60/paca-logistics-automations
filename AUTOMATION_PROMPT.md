# Master prompt — adding a new automation to Transport Paca

> Copy-paste **everything below the line** into a fresh Claude Code session whose only job is to add one new automation. The chat does not need any extra context — this file plus the repo's `AGENTS.md`, `CLAUDE.md`, and `FEATURES.md` are everything.

---

You are extending the **Transport Paca** desktop app (Tauri 2 + React 18 + TypeScript + Tailwind v4). The scaffold is shipped. Your only job is to add **one** new automation as a self-contained "block" in `src/skills/<slug>/`. The skill registry auto-discovers it via `import.meta.glob` — you do not edit the router, sidebar, or registry.

## 0. Read these files (in this order)

1. `FEATURES.md` — what already exists. **You will append to this file at the end.**
2. `AGENTS.md` — architecture, signing-key location, public-repo safety rules.
3. `CLAUDE.md` — conventions, naming, file-size cap (500 lines).
4. `src/skills/leads/` — the **reference implementation**. Mirror its structure exactly.

## Tools available in this session

Use the right tool for the job. Don't burn tokens on the wrong tier.

| Tool family | When to use it | When to skip it |
|---|---|---|
| **Direct file edits** (Read / Edit / Write / Glob / Grep) | Default for all skill code. ~80% of the work. | Never skip for skill source — these are fastest. |
| **Bash** (`pnpm typecheck`, `pnpm test`, `pnpm build`, `git`) | Validate after each substantial change. Commit at the end. | For one-shot file reads — use the Read tool. |
| **Claude in Chrome MCP** (`mcp__Claude_in_Chrome__*`) | UI work where you need to *see* the result — match a design, debug a layout bug, verify a click flow, screenshot a state for the user. Launch `pnpm dev:vite` background, then `navigate` → `screenshot` → iterate. **Use `browser_batch` to combine navigate+wait+screenshot in one round-trip.** | Don't open a browser to typecheck or to read a file. |
| **Vitest + Playwright** (via `pnpm test` / `pnpm test:e2e`) | Add unit tests for Zod schemas, cost math, anything pure. Add a Playwright spec under `tests/e2e/<slug>.spec.ts` for the ParamView render path. | Don't write integration tests that need the Tauri shell (SQLite) running — those need `tauri-driver` which isn't wired yet. |
| **Computer Use MCP** (`mcp__computer-use__*`) | Native desktop windows (the actual Tauri-built app, Finder/Explorer, native installers). | Anything inside the browser — Chrome MCP is faster and DOM-aware. |
| **Ruflo MCP** (`mcp__ruflo__*`) | Multi-agent coordination, swarm patterns, semantic memory across sessions. Useful if the new automation is genuinely 4+ truly independent files (rare). | Single-skill blocks — direct edits win on speed and clarity. |
| **Claude Preview MCP** (`mcp__Claude_Preview__*`) | Mostly redundant with Chrome MCP — skip unless Chrome isn't connected. | Default. |

**For UI work specifically:** launch `pnpm dev:vite` in the background, then plant a placeholder API key in localStorage via Chrome MCP's `javascript_tool` so you can navigate past the first-run gate without needing real credentials:

```js
localStorage.setItem("transport-paca-settings", JSON.stringify({
  state: { apiKey: "sk-ant-PLACEHOLDER", locale: "en", theme: "system",
           monthlyBudgetUsd: 20, devMode: false, pinnedCities: [],
           pinnedLanes: [], historyMirror: [] },
  version: 0,
}));
```

Then `navigate` to `http://localhost:1420/skills/<slug>` and iterate. **Do not commit UI changes you haven't visually verified at least once** — that's the loop break that produced the "still rectangular boxes" bug.

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
- **NEVER** hardcode colors — use design tokens (`bg-surface-1`, `text-accent`, `bg-gradient-accent`, etc.) from `src/index.css @theme`. The current palette is dark slate + coral-orange gradient accent + pill-shaped buttons. Don't drift.
- **NEVER** skip the `ctx.budget.canAffordEstimate()` pre-check if the handler calls Anthropic.
- **NEVER** skip the `ctx.blacklist.filterCarriers()` post-filter if the result contains companies.
- **NEVER** create a file over 500 lines. Split it.
- **NEVER** edit `src/core/skill-registry.ts`, `src/router.tsx`, or `src/components/Sidebar.tsx` — auto-discovery handles wiring.
- **NEVER** ship UI changes without using Chrome MCP to verify them visually at least once.
- **ALWAYS** validate every external response (Anthropic, sidecar, DB) with Zod at the boundary.
- **ALWAYS** include both `en` and `fr` translations.
- **ALWAYS** append to `FEATURES.md` before committing.

That's it. Ship the block, update the registry, tell the user. 200 lines of code, maybe 300.
