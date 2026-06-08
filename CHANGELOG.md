# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **shippers** automation ("Recherche d'expéditeurs" / "Shipper lead finder"): finds Canadian businesses likely to need freight hauled — the brokerage's potential customers — with public contact info and a buying-signal rationale per prospect. Mirrors the `leads` block and deliberately shares the freight-equipment + lane vocabulary so found shippers line up with found carriers for matching.
- **Light / Dark / System** theme switch: a full light theme for the content area (OS-preference-aware "System"), toggleable from the header or Settings → Theme. The dark-navy chrome stays fixed (brand-logo constraint).
- **Accurate Canada map**: the province picker now renders real provincial + territorial geography (`@svg-maps/canada`) tinted with the brand orange (legible in both themes), replacing the schematic blobs. Selecting a province reveals an animated NSEW compass (sector picker) at its centroid.
- **Loading skeletons**: a result-shaped shimmer placeholder (`Skeleton` / `ResultSkeleton`) replaces the bare "loading…" text while a search runs.

### Changed
- UI design-system refresh (palette v3): de-blued the neutral palette to clean greys, replaced the coral→yellow gradient + orange glow with one solid orange accent (`#fa6f3a`), moderated the fully-pill inputs/buttons to crisp 14 px radii (pill kept for chips), added hairline borders + refined elevation. Token-driven in `src/index.css @theme`; layout unchanged.
- Micro-interactions: subtle card hover-lift, button press feedback (`active:scale`), and smoother focus-visible rings — all ≤120 ms.

### Fixed
- Light theme borders: card / input / outline-button / dropdown-divider now use the themed `border-border-subtle` (visible light-grey) instead of near-invisible hardcoded `black/4–10%`.
- Accessibility (light theme): input-placeholder and text-dim bumped toward WCAG AA contrast; darker, more-opaque focus ring on light surfaces; Canada-map paths **and** the NSEW compass are now keyboard-navigable with aria labels.
- leads results: the Company column header used the `settings.title` key (rendered "Settings"/"Paramètres") — now a proper label; table rows use a stable key (was array index, breaking reconciliation when blacklisting); removed a dead `m ? 60 : 60` ternary in the rate-limit handler.
- i18n: added the previously-missing `result.*` keys (copy/blacklisted-hidden) and `common.searching` to both locales.

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
