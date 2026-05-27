# Transport Paca — Feature registry

Every automation and every notable UI/infra feature lives here. **Append a new entry whenever something ships.** This file is the single source of truth — the dev-mode panel reads it, future Claude sessions read it, the team reads it.

## Append format (copy-paste, fill in)

```markdown
### <slug-or-feature-name>

- **Type:** automation | ui | infra | docs
- **Added:** YYYY-MM-DD
- **Status:** shipped | wip | deprecated
- **Description:** One sentence — what it does for the user.
- **Inputs / triggers:** (automations only) — comma-separated list, or N/A
- **Output / effect:** (automations only) — what comes back, or N/A
- **Files touched:** `src/skills/<slug>/`, etc.
- **Notes:** Any gotchas, dependencies, future work.
```

---

## Automations

### leads

- **Type:** automation
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Generates a vetted list of Canadian trucking carriers matching truck type, fleet size, provinces, sectors, cities, and lanes, with public contact details where available.
- **Inputs:** truck_types (10 options, multi), fleet_size (single), count (5–50), provinces (13 + 6 region quick-picks), regional sectors (PROV-X soft filter), cities (35-city grid), lanes (156 permutations + 18 presets)
- **Output:** `LeadsResult { query_summary, carriers[], sources[], cost_estimate_usd, blacklisted_count }`
- **Files touched:** `src/skills/leads/{manifest.ts, schemas.ts, prompt.ts, handler.ts, ParamView.tsx, ResultView.tsx, data.ts, i18n/{en,fr}.json}`
- **Notes:** Uses Anthropic's hosted `web_search` tool (max 6 calls). Pre-call budget gate via `ctx.budget.canAffordEstimate()`. Post-call blacklist filter via `ctx.blacklist.filterCarriers()`. Cost computed from real `usage` and logged to `spend_log`.

---

## UI / infra

### dev-mode

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Toggleable floating diagnostics panel showing app version, build mode, Tauri detection, locale, masked API key, sidecar/DB health, current spend, and the full registered-skills list. Includes a reset button.
- **Files touched:** `src/components/DevPanel.tsx`, `src/pages/Settings.tsx`, `src/core/settings-store.ts`
- **Notes:** Toggled from Settings → Developer card. Polls sidecar `/healthz` and DB every 15 s.

### command-palette

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Ctrl/Cmd+K palette for jumping to any registered automation, history, settings, or for switching language. Uses `cmdk`.
- **Files touched:** `src/components/CommandPalette.tsx`, `src/App.tsx`

### budget-meter

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Header bar showing this month's Anthropic spend against the configured cap (default $20). Green < 50%, amber 50–80%, red > 80%. Hard block at 100% via `canAffordEstimate`.
- **Files touched:** `src/components/BudgetMeter.tsx`, `src/core/budget.ts`

### blacklist-manager

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Manage carriers excluded from every skill's results. Add via row action ("Blacklist" button) or directly from Settings → Blacklist. Normalized-name matching strips Inc/Ltd/Corp/Transport/Trucking suffixes.
- **Files touched:** `src/components/BlacklistManager.tsx`, `src/components/BlacklistDialog.tsx`, `src/core/blacklist.ts`

### first-run-gate + auto-navigate

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** App routes to `/settings` until an API key is set. Saving a first key auto-navigates to the first registered automation. Pressing Enter on the API-key input confirms (no more "stuck on Settings" bug).
- **Files touched:** `src/router.tsx`, `src/pages/Settings.tsx`

### auto-update

- **Type:** infra
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Tag-driven GitHub Actions release pipeline. Tagging `v*` builds a signed `.msi` and publishes `latest.json`; every installed client self-updates on next launch.
- **Files touched:** `.github/workflows/release.yml`, `src-tauri/tauri.conf.json`
- **Notes:** Requires `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` GitHub Actions secrets.

### tauri-sidecar

- **Type:** infra
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Local Express server (`server/`) on 127.0.0.1:19191 that proxies Anthropic API calls so the API key never reaches browser DevTools.
- **Files touched:** `server/index.ts`, `server/routes/*`, `server/lib/anthropic.ts`

### i18n-fr-default

- **Type:** infra
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Bilingual UI via i18next, French as default. Every user-visible string goes through `t()`.
- **Files touched:** `src/core/i18n.ts`, `src/locales/{en,fr}.json`, every component
