# AGENTS.md — Transport Paca

Architecture, conventions, and operational rules for any Claude Code / Ruflo session working on this repo.

## Architecture overview

```
┌────────────────────────────────────────────────┐
│ Tauri 2 webview (React 18 + Vite + Tailwind v4)│
│  ├─ pages/      Settings, History, SkillRunner │
│  ├─ skills/<slug>/  manifest, schemas, views   │
│  ├─ components/ ui primitives + shared widgets │
│  └─ core/       db, blacklist, budget, i18n,    │
│                 settings-store, skill-registry  │
└─────────────────┬──────────────────────────────┘
                  │ HTTP 127.0.0.1:19191
┌─────────────────▼──────────────────────────────┐
│ Tauri sidecar (Node + Express)                 │
│  └─ /api/claude/messages — Anthropic proxy     │
└─────────────────┬──────────────────────────────┘
                  │ HTTPS api.anthropic.com
              Anthropic + web_search
```

Direct DB access: the webview uses **tauri-plugin-sql** to talk to SQLite at `appData/transport-paca.db` from the renderer. Schema migrations live in `src-tauri/migrations/`. The sidecar **never** touches the DB — it is a pure Anthropic proxy whose only job is to keep the API key out of browser DevTools.

## Design tokens

All colors / spacing / typography flow from `src/index.css` `@theme`. **Never hardcode hex.** Use Tailwind utilities backed by the design tokens (`bg-surface-1`, `text-text-muted`, `border-border-subtle`, `text-accent`, etc.).

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#fafafa` | `#09090b` |
| `--color-surface-1` | `#ffffff` | `#131316` |
| `--color-surface-2` | `#f4f4f5` | `#1c1c20` |
| `--color-text` | `#09090b` | `#fafafa` |
| `--color-text-muted` | `#52525b` | `#a1a1aa` |
| `--color-accent` | `#f97316` (burnt orange — locked) |

Animations capped at **120 ms**. Borders separate cards; no decorative shadows.

## File-size rule

Keep files under **500 lines**. If you blow past that, split into helpers/sub-components in the same directory.

## Naming

- React components: `PascalCase.tsx`, default export only when it makes sense (router pages); named exports otherwise.
- Core / lib modules: `kebab-case.ts`, named exports.
- Skill slugs: `kebab-case`.
- Skill directories: `src/skills/<slug>/`. Must contain `manifest.ts` (default export) + `paramsSchema` + `resultSchema` + `ParamView` + `ResultView` + `handler`.

## Error patterns

- `BudgetError` (from `core/types`): pre-call gate failures. SkillRunner shows the red banner.
- `SidecarError` (from `core/claude-client`): network or Anthropic 4xx/5xx.
- All other errors propagate as `Error` and show in the same banner.

## Adding a new automation

See Section 12 of the build prompt (also reproduced in `CLAUDE.md`). The short version:

1. `pnpm gen:skill <slug>` to copy `src/skills/leads/` as a template.
2. Edit `manifest.ts` + `schemas.ts` + `prompt.ts` + `handler.ts` + `ParamView.tsx` + `ResultView.tsx`.
3. Add `i18n/{en,fr}.json` entries.
4. `pnpm typecheck && pnpm lint && pnpm test`.
5. Add a Playwright e2e at `tests/e2e/<slug>.spec.ts`.
6. Bump `CHANGELOG.md` + version in `package.json` and `src-tauri/tauri.conf.json`.
7. `git commit && git tag vX.Y.Z && git push origin main --tags`.

## Tauri signing key — IMPORTANT

The updater public key is **already embedded** in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.

The matching **private key lives at**: `$HOME/.tauri/transport-paca.key` (with a `.pub` next to it).

**Never commit the private key. It is covered by `.gitignore` (`*.key`).**

For the GitHub Actions release workflow to sign updater payloads, the private key + its passphrase must be added as GitHub Actions secrets in this repository's Settings → Secrets and variables → Actions:

| Secret name | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | The full contents of `$HOME/.tauri/transport-paca.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The passphrase set when the keypair was generated |

The release workflow (`.github/workflows/release.yml`) reads both via `env.TAURI_SIGNING_PRIVATE_KEY` and `env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Without these the tag push will fail at the signing step.

If the private key is ever lost, you must:
1. Generate a new keypair: `pnpm tauri signer generate -w ~/.tauri/transport-paca.key`
2. Update `pubkey` in `src-tauri/tauri.conf.json`
3. Re-deploy every team installation manually — the old key can no longer sign updates the existing clients will accept.

## Public-repo safety rules

Treat this repo as if it were posted to a billboard at a competitor's office.

**NEVER commit:**
- Real carrier names (use `Test Carrier Inc.`, `Demo Transport Ltd.` in fixtures)
- Real phone numbers (use `555-0100..0199`), emails (`example.com`), addresses
- Client names, partner names, internal business processes
- Real prices, rates, margins, quote data
- Team members' real names in comments or commit messages (first names or initials only)
- API keys, even revoked ones (use `sk-ant-PLACEHOLDER` in docs)
- Screenshots of real searches (use mocked data)
- `*.db`, `settings.json`, `*.csv`, anything in `exports/` or `imports/`

**Allowed:**
- Generic Canadian geography (provinces, cities, lane permutations — public info)
- Generic equipment types (industry-standard terminology)
- Generic UI strings and translations
- Generic placeholder data in test fixtures

A future Husky pre-commit hook (Phase 4 polish) will grep staged diffs for common forbidden patterns. If you trip it, `git commit --no-verify` consciously.

## Settings storage migration note

API keys are currently stored in `localStorage` via the Zustand `persist` middleware (key `transport-paca-settings`). The build prompt's Decision 5 specifies a `settings.json` file under `appDataDir`. Future migration:

1. Add a `core/settings-fs.ts` that reads/writes via `@tauri-apps/plugin-fs` with `BaseDirectory.AppData`.
2. On startup, hydrate the Zustand store from the file (fall back to localStorage if missing).
3. On every `set*` call, mirror back to disk.

The store API stays identical; only the persistence layer changes.

## Background-worker hooks (Ruflo)

| Worker | When |
|---|---|
| `audit` | After security-touching changes (API key handling, sidecar permissions) |
| `optimize` | After perf-touching changes (bundle size, DB queries) |
| `testgaps` | After adding a new skill or major feature |
| `map` | Every 5+ file changes |
| `document` | After API surface changes |

```bash
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit
```
