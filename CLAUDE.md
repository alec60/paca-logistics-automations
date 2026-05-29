# Transport Paca — Claude Code & Ruflo guide

Project-specific instructions for any Claude Code / Ruflo session working in this repo. Read alongside `AGENTS.md` (architecture + ops) and `README.md` (humans).

## Project at a glance

Carrier intelligence desktop app. Tauri 2 (Rust + WebView) shipping a React 18 + TypeScript + Tailwind v4 frontend. Local Node sidecar proxies Anthropic API calls so the API key never reaches the renderer.

Frontend talks to SQLite directly via `@tauri-apps/plugin-sql`. The sidecar is purely a network proxy.

```
src/                  React app (skills, pages, components, core/ services)
server/               Node sidecar — Express on 127.0.0.1:19191
src-tauri/            Rust + Tauri shell, plugins, migrations, signing
tests/{unit,e2e}/     Vitest + Playwright
.github/workflows/    CI + signed release
```

## Day-to-day commands

```bash
pnpm install
pnpm dev              # vite + sidecar concurrently
pnpm typecheck
pnpm lint
pnpm test             # vitest
pnpm test:e2e         # playwright (against vite preview)
pnpm tauri dev        # full Tauri desktop dev loop
pnpm tauri build      # signed .msi
```

## Conventions

- Files under **500 lines**. Split when you hit it.
- Components: `PascalCase.tsx`. Core/lib: `kebab-case.ts`.
- Skill directories: `src/skills/<slug>/` with `manifest.ts` (default export), `schemas.ts`, `prompt.ts`, `handler.ts`, `ParamView.tsx`, `ResultView.tsx`, `i18n/{en,fr}.json`.
- Tailwind utilities only — never hardcode hex. Use design tokens from `src/index.css @theme`.
- All user-visible strings via `t()` (i18next). French is default.
- Animations capped at 120 ms.
- Validate input at system boundaries with Zod.
- **Form submits must use a `type="button"` + `onClick`, never a native submit button.** In the Tauri WebView (WebView2) a native `<form>` submit triggers a page navigation/reload instead of being handled by React — the action silently fails even though it works in a normal browser. This bit us on the leads Run Search button.
- No real carrier names, phone numbers, emails, or business data in code, tests, fixtures, or commits — see Section 11 in `AGENTS.md`.

## Adding a new automation

> **Use `AUTOMATION_PROMPT.md` as the master prompt for any dedicated "add automation" chat.** Hand it the whole repo and that one prompt — they're sufficient. Every new skill MUST append an entry to `FEATURES.md` before committing.

Short version:

1. **Spec.** Write one paragraph in `CHANGELOG.md` describing what the new skill does.
2. **Pseudocode.** Sketch the params, prompt, result shape, UI.
3. **Architecture.** Run `pnpm gen:skill <slug>` to copy `src/skills/leads/` as a template.
4. **Refinement (parallel agents):**
   - Agent A: edit `manifest.ts` (slug, bilingual name, description, icon).
   - Agent B: edit `paramsSchema` + `ParamView.tsx`.
   - Agent C: edit `prompt.ts` + `handler.ts` (include `ctx.budget.canAffordEstimate()` pre-check and `ctx.blacklist.filterCarriers()` if results have companies).
   - Agent D: edit `ResultView.tsx`.
   - Agent E: add `i18n/{en,fr}.json` entries for the new skill.
   - Reviewer: cross-check Zod schemas, i18n coverage, blacklist + budget integration.
5. **Completion.** Add a Playwright e2e at `tests/e2e/<slug>.spec.ts`. Run `pnpm typecheck && pnpm lint && pnpm test` — all green before tagging.
6. **Release.** Bump version in `package.json` + `src-tauri/tauri.conf.json`. Update `CHANGELOG.md`. `git commit && git tag vX.Y.Z && git push origin main --tags`.
7. **Verify.** GitHub Action builds the `.msi`, publishes the release, and writes `latest.json`. Within ~15 minutes every team member's app picks up the update on next launch.

## Release workflow

Tag-driven via `.github/workflows/release.yml`:

```bash
# After all checks pass on main:
git tag v0.1.0
git push origin main --tags
```

The Action:
1. Checks out, installs deps, builds frontend + sidecar.
2. Runs `tauri-apps/tauri-action@v0` → produces signed `.msi` + `latest.json`.
3. Publishes a GitHub Release. Installed clients pull `latest.json` on next launch and self-update.

**Required secrets** (Settings → Secrets and variables → Actions):
- `TAURI_SIGNING_PRIVATE_KEY` — contents of `$HOME/.tauri/transport-paca.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — its passphrase

These never go in the repo. The public key lives in `src-tauri/tauri.conf.json` (already embedded).

## What NEVER goes in the repo

**Public-repo safety — the repo is effectively public; treat it that way.**

- Real carrier names → use `Test Carrier Inc.`, `Demo Transport Ltd.`
- Real phone numbers → `555-0100..0199`
- Real emails → `example.com`
- Real addresses, client names, partner names, prices, margins, quote data
- Team members' real names (first names or initials in commits)
- API keys — even revoked. Use `sk-ant-PLACEHOLDER`.
- Screenshots of real searches → use mocked data
- `*.db`, `settings.json`, `*.csv`, anything in `exports/` or `imports/`

These are excluded by `.gitignore`. Don't add a `--force` to override.

Allowed: public Canadian geography, industry-standard equipment terminology, generic UI strings, generic placeholder data.

## Ruflo / Claude Code orchestration

Use `ToolSearch` to discover Ruflo MCP tools (`memory_search`, `swarm_init`, `agent_spawn`, etc.) when starting non-trivial work. Single-file edits and small fixes are faster as direct tool calls. Swarms earn their keep on 3+ truly independent files (Phase 3 / Phase 6 are good examples — Phase 3 split into ParamView / ResultView / prompt / handler agents).

When spawning a coordinated team, always:
- Name every agent (`name: "role"` makes them addressable via `SendMessage`).
- Include comms instructions in each prompt: who to message, what to send.
- Spawn ALL agents in one message with `run_in_background: true`.
- After spawning, STOP and wait for results. Don't poll.

## Quick troubleshooting

| Symptom | Likely cause |
|---|---|
| Build fails with `tauri-plugin-sql` not found | run `pnpm tauri build` once to fetch the Rust deps |
| Settings doesn't persist across launches | localStorage key is `transport-paca-settings`; check DevTools |
| Updater never fires | `pubkey` in `tauri.conf.json` doesn't match the GHA-signing private key |
| Skill not in sidebar | `manifest.ts` must `default export` the `SkillManifest`; the registry uses `import.meta.glob` |
| `pnpm dev` sidecar dies | check port 19191 isn't in use; override with `TP_SIDECAR_PORT` |
| A button/form does nothing in the Tauri app but works in the browser | Native `<form>` submit triggers a WebView2 navigation/reload. Use a `type="button"` + `onClick`, not a native submit button. |
