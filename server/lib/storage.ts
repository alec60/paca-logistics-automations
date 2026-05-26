// In Phase 5 the Tauri Rust side launches the sidecar with the apiKey passed
// via env, or the sidecar reads appDataDir/settings.json. For now the frontend
// supplies the apiKey on each call.
export const SETTINGS_FILENAME = "settings.json";
