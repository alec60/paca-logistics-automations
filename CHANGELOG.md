# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] — 2026-05-26

Initial release.

### Added
- Tauri 2 + React 18 + TypeScript scaffold with Tailwind v4 design tokens
  (Linear/Vercel-grade dark + light palettes; burnt-orange accent locked).
- Bilingual i18n (French default, English secondary) via i18next + react-i18next.
- SQLite persistence via tauri-plugin-sql with migrations for `settings`,
  `search_history`, `favorited_carriers`, `blacklisted_carriers`, `spend_log`.
- Settings store (Zustand): API key, language, theme, monthly budget.
- First-run gate that routes to /settings until an API key is set.
- Local Express sidecar (`server/`) on 127.0.0.1:19191 — Anthropic SDK proxy.
- BlacklistAPI with normalized-name matching, manager UI, row action.
- BudgetAPI with hard $20 monthly limit, pre-call gate, post-call spend logging,
  live BudgetMeter in the header.
- Skill registry with `import.meta.glob` auto-discovery.
- **Leads skill** ("Recherche de transporteurs" / "Carrier lead finder"):
  Anthropic Messages API + hosted `web_search` tool. Multi-select truck types
  (10), fleet size, count (5/10/15/20/30/50), all 13 provinces + 6 region
  quick-picks, regional sectors (PROV-X soft filter), 35-city quick-pick grid,
  all 156 lanes searchable + 18 preset lane buttons. Zod-validated structured
  JSON output; blacklist post-filter; cost computed from Anthropic usage and
  logged to `spend_log`; persisted to `search_history`.
- Tauri auto-updater wired to GitHub Releases on `alec60/paca-logistics-automations`.
- GitHub Actions: `ci.yml` (typecheck, lint, test) and `release.yml` (signed
  `.msi` build with updater payload).

### Required GHA secrets
- `TAURI_SIGNING_PRIVATE_KEY` — contents of `$HOME/.tauri/transport-paca.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — its passphrase
