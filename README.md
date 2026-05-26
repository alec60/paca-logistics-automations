# Transport Paca

Carrier intelligence desktop app for Transport Paca. Tauri 2 + React 18 + TypeScript + Tailwind v4.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Rust (stable) — install via https://rustup.rs
- Tauri prerequisites for your OS: https://v2.tauri.app/start/prerequisites/

## Development

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

Produces a signed `.msi` under `src-tauri/target/release/bundle/msi/`.

## Release

Tag-driven via GitHub Actions:

```bash
git tag v0.1.0
git push origin main --tags
```

See `.github/workflows/release.yml`. The action builds, signs with the Tauri updater key, and publishes `latest.json` so installed clients auto-update on next launch.

## License

Proprietary — Transport Paca.
