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
- **Status:** shipped (revised 2026-05-27)
- **Description:** Stylized SVG map of Canada used in the leads ParamView. All 13 provinces + territories drawn as cubic-Bezier polygons positioned roughly geographically (YT/NT/NU territories band on top, BC tall on the west, prairies as a row, ON/QC large in the middle, NL detached on the east, NB/NS/PE clustered as Maritimes). On selection, the abbreviation is replaced inline by an NSEW sector cluster + center deselect.
- **Files touched:** `src/components/CanadaMap.tsx`

### region-quick-picker

- **Type:** ui
- **Added:** 2026-05-27
- **Status:** shipped
- **Description:** Pill row above the Canada map for one-tap region presets (Western, Prairies, Central, Maritimes, Territories, All Canada). Tapping a region adds its provinces to the selection; tapping again removes them. Replaces the earlier dedicated territory row — territories now live on the map itself.
- **Files touched:** `src/components/RegionPicker.tsx`, `src/skills/leads/data.ts` (added `REGIONS`)

### city-search

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped (revised 2026-05-27)
- **Description:** Type-ahead city picker that auto-filters to cities in the currently selected provinces. Dropdown stays hidden until the user types 2+ characters or selects at least one province (the database is now 250+ Canadian cities — listing everything would be useless). Each row has a pin star; pinned cities sort to the top and persist across sessions via Zustand → localStorage. Backed by `CITY_TO_PROVINCE` map covering all 13 provinces.
- **Files touched:** `src/components/CitySearch.tsx`, `src/skills/leads/data.ts` (`CITY_TO_PROVINCE`), `src/core/settings-store.ts` (added `pinnedCities`)

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

### passcode-lock

- **Type:** infra
- **Added:** 2026-05-27
- **Status:** shipped
- **Description:** Mandatory passcode gate at app start. On first launch the user picks a passcode (a brand-tied default `Camions-Paca-2026` is suggested but not required). The passcode is run through PBKDF2 (200k SHA-256 iterations) with a random 128-bit salt; the resulting AES-GCM 256 key is held in memory only and used to encrypt the Anthropic API key at rest. localStorage holds `{ salt, verifier }` — never the passcode itself. Wrong-passcode attempts rate-limit at 5 → 60-second lockout. Forget the passcode and the encrypted data is unrecoverable (no backdoor).
- **Files touched:** `src/core/crypto.ts`, `src/core/lock-store.ts`, `src/core/runtime-secrets.ts`, `src/components/LockScreen.tsx`, `src/components/LockButton.tsx`, `src/App.tsx`, `src/router.tsx`, `src/core/settings-store.ts` (apiKey is now `apiKeyEncrypted: Ciphertext | null`)
- **Notes:** Threat model is at-rest data theft (someone gets your localStorage). Doesn't protect against an attacker with your running session. Lock button in the header re-locks; refresh also clears the in-memory key. Change passcode via Settings → Passcode card.

### settings-backup-export

- **Type:** ui
- **Added:** 2026-05-27
- **Status:** shipped
- **Description:** Manual cross-device sync stopgap until a backend lands. Export downloads the full persisted state (encrypted apiKey ciphertext + pins + history + budget + language + theme) as a JSON file. Import replaces the local state from a JSON file. Decrypting the exported apiKey on another install requires the same passcode (the salt + verifier travel with the JSON so the destination can re-derive the key).
- **Files touched:** `src/pages/Settings.tsx`, `src/core/settings-store.ts`
- **Notes:** Real-time sync (pin/history actions auto-push to a shared store) needs a backend — Cloudflare Worker + KV is the simplest free option, ~1hr to wire. Not yet started.

### blacklist-relocation

- **Type:** ui
- **Added:** 2026-05-27
- **Status:** shipped
- **Description:** Blacklist manager moved out of `/settings` and into the leads ParamView as a collapsible section above the Run Search button. Settings is now purely cross-cutting concerns (key, language, budget, passcode, backup, dev mode). Per-automation state lives next to the automation that owns it.
- **Files touched:** `src/components/BlacklistSection.tsx`, `src/skills/leads/ParamView.tsx`, `src/pages/Settings.tsx` (Blacklist card removed)

### db-fail-fast

- **Type:** infra
- **Added:** 2026-05-27
- **Status:** shipped
- **Description:** `getDb()` now rejects immediately when not running inside the Tauri webview (no `__TAURI_INTERNALS__`). Previously it would call `tauri-plugin-sql` over a non-existent IPC channel and hang every consumer forever. Critical for `pnpm dev:vite` browser previews, e2e tests, and any future GitHub Pages build.
- **Files touched:** `src/core/db.ts`

### security-hardening-2026-05-28

- **Type:** infra
- **Added:** 2026-05-28
- **Status:** shipped
- **Description:** Round of fixes from a third-party audit. Highlights:
  - **`.claude/` untracked from git** (238 files were committed — agent definitions, hooks, memory.db).
  - **Sidecar session model**: the renderer no longer puts the apiKey in every request body. After unlock the key is handed to `POST /api/auth/register` once; the sidecar holds it in process memory and issues a 32-byte random session token used as `X-Session-Token` thereafter. 1-hour rolling TTL, auto re-register on 401.
  - **Anthropic request sanitization**: `/api/claude/messages` whitelists model (`claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20250929`), caps `max_tokens` at 4096, allows only `web_search_20250305` as a tool.
  - **CORS allowlist** replaces `*`: `tauri://localhost`, `http://tauri.localhost`, `https://tauri.localhost`, and the dev Vite ports.
  - **Tauri CSP** is now a strict policy (default-src self, no inline scripts, only the sidecar + tauri:// + ipc: as connect-src).
  - **Tauri capabilities pruned**: dropped `fs`, `shell`, `process` plugins entirely from Cargo + capabilities. Kept `sql`, `dialog (allow-save)`, `updater`, and core. `withGlobalTauri` flipped to `false`.
  - **Release workflow** now creates **drafts** so a stray tag push can't ship.
  - **`keyPrefix` removed** from `/api/claude/test` responses.
  - **`carrier.website`** now goes through `z.string().url()` + http/https filter at parse time; no more `<a href={…}>` for `javascript:` strings.
  - **Settings export split**: separate "Preferences only" (safe) and "Export everything (key + history)" (with confirm-dialog warning). UI no longer says "share" — clarified as backup.
  - **Lock screen**: added a **"Generate random"** button (8-syllable + digits + symbol) and a visible warning that the in-source suggested passcode is weak by definition.
  - **Misleading copy fixed**: API key description no longer claims "never sent anywhere except api.anthropic.com" — explicit about the local sidecar hop.
  - **Dead code removed**: `server/routes/{settings,blacklist,budget}.ts`, `server/lib/storage.ts`, "Send to CRM" button, broken "More" button.
- **Deferred**: encrypting SQLite `search_history` at rest (audit P2.10) — significant refactor, separate session.
- **Files touched:** `.gitignore`, `server/routes/auth.ts` (new), `server/routes/claude.ts`, `server/index.ts`, `src/core/claude-client.ts`, `src/core/runtime-secrets.ts`, `src/core/settings-store.ts`, `src/components/LockScreen.tsx`, `src/pages/Settings.tsx`, `src/skills/leads/{schemas.ts,handler.ts,manifest.ts,ResultView.tsx}`, `src-tauri/{tauri.conf.json,Cargo.toml,capabilities/default.json,src/lib.rs}`, `.github/workflows/release.yml`

### palette-v2

- **Type:** ui
- **Added:** 2026-05-26
- **Status:** shipped (revised 2026-05-27)
- **Description:** Reskinned to match the user's reference image. Deep dark slate background (`#161a26`), coral→orange gradient as the brand accent, much rounder corners everywhere (pill-shaped buttons + inputs, 16/22/28 px card radii). New `--gradient-accent` CSS variable powers `bg-gradient-accent` and `shadow-glow` utilities for hero affordances. Dark mode is locked (no `prefers-color-scheme` auto-switch) until a Settings toggle ships.
- **Files touched:** `src/index.css`, `src/components/ui/{button,input,card}.tsx`
