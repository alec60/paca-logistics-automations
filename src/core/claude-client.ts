// Frontend Claude client — proxies through the local Tauri sidecar.
// Phase 2 wires this to the Express sidecar over a random localhost port.

export interface ClaudeRequest {
  skillSlug: string;
  params: unknown;
}

export async function callSkillEndpoint<T>(_req: ClaudeRequest): Promise<T> {
  throw new Error("claude-client not wired yet — see Phase 2");
}
