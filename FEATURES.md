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
- **Inputs:** truck_types (10, multi), fleet_size (single), count (5–50), provinces & territories (13, picked via stylized SVG Canada map with inline NSEW sector overlays), cities (37, type-ahead search filtered by selected provinces + pinning), lanes (2-step From×To builder, 156 possible permutations, pinning)
- **Output:** `LeadsResult { query_summary, carriers[], sources[], cost_estimate_usd, blacklisted_count }`
- **Files touched:** `src/skills/leads/{manifest.ts, schemas.ts, prompt.ts, handler.ts, ParamView.tsx, ResultView.tsx, data.ts, i18n/{en,fr}.json}`, `src/components/{CanadaMap.tsx, TerritoryRow.tsx, CitySearch.tsx, LanePicker.tsx}`
- **Notes:** Uses Anthropic's hosted `web_search` tool (capped at 3 calls for Tier 1 rate limits). Pre-call budget gate via `ctx.budget.canAffordEstimate()`. Post-call blacklist filter via `ctx.blacklist.filterCarriers()`. Cost computed from real `usage` and logged to `spend_log`.

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
- **Status:** removed 2026-05-26
- **Description:** ~~Header bar showing this month's Anthropic spend against the configured cap.~~ Removed because Anthropic doesn't expose live org spend over the API — the local SQLite mirror was confusing more than it helped. Pre-call cost estimation via `ctx.budget.canAffordEstimate()` still runs inside skill handlers; only the header widget is gone.
- **Files touched:** ~~`src/components/BudgetMeter.tsx`~~ (deleted), `src/App.tsx` (unmounted)

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
- **Description:** Bilingual UI via i18next, French as default. Every user-visible string goes through `t()`. The active locale is read from the persisted Zustand store at i18n init time and stays in sync via a store subscription, so a chosen English stays English across restarts.
- **Files touched:** `src/core/i18n.ts`, `src/locales/{en,fr}.json`, every component

### canada-map

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Stylized SVG map of Canada used in the leads ParamView. 10 provinces as clickable rounded polygons positioned roughly geographically (BC tall on the west, prairies as a row, ON/QC large in the middle, NL detached on the east, NB/NS/PE clustered as Maritimes). On selection, the province's abbreviation is replaced inline by an NSEW sector cluster + center deselect button.
- **Files touched:** `src/components/CanadaMap.tsx`

### territory-row

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Distinct labeled pill row above the Canada map for YT / NT / NU. Selecting a territory pill expands it inline to show NSEW sector toggles + a deselect ×, mirroring the province-on-map interaction.
- **Files touched:** `src/components/TerritoryRow.tsx`

### city-search

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Type-ahead city picker that auto-filters to only cities in the currently selected provinces. Each row has a pin star — pinned cities sort to the top of the list and persist across sessions via Zustand → localStorage.
- **Files touched:** `src/components/CitySearch.tsx`, `src/core/settings-store.ts` (added `pinnedCities`)

### lane-picker

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Two-step From × To lane builder. Pick one or more origin provinces, pick one or more destinations, click Add — every origin×dest combination becomes a lane chip (self-loops skipped). Selected lane chips have a pin star; pinned lanes show as quick-select pills at the top across sessions.
- **Files touched:** `src/components/LanePicker.tsx`, `src/core/settings-store.ts` (added `pinnedLanes`)

### history-mirror

- **Type:** infra
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Search history now writes to **both** SQLite (`search_history` table, durable across reinstalls) and a Zustand `historyMirror` slice (last 50 entries, in localStorage). The `/history` page reads from whichever has more rows. This kills the "history wiped after restart" complaint when running outside a packaged Tauri shell where SQLite isn't reachable.
- **Files touched:** `src/skills/leads/handler.ts`, `src/core/settings-store.ts`, `src/pages/History.tsx`

### palette-v2

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped
- **Description:** Reskinned to match the user's reference image. Deep dark slate background (`#161a26`), coral→orange gradient as the brand accent, much rounder corners everywhere (pill-shaped buttons + inputs, 16/22/28 px card radii). New `--gradient-accent` CSS variable powers `bg-gradient-accent` and `shadow-glow` utilities for hero affordances.
- **Files touched:** `src/index.css`, `src/components/ui/{button,input,card}.tsx`
