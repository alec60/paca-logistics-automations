// Frontend Claude client — proxies through the local Tauri sidecar.
// The sidecar holds the Anthropic API key in-process; the browser never sees it.

const DEFAULT_SIDECAR_PORT = 19191;

function sidecarBase(): string {
  // In dev the sidecar listens on a fixed port; in production Tauri injects the
  // chosen random port via window.__TP_SIDECAR_PORT__ at startup.
  const port =
    (window as unknown as { __TP_SIDECAR_PORT__?: number }).__TP_SIDECAR_PORT__ ??
    DEFAULT_SIDECAR_PORT;
  return `http://127.0.0.1:${port}`;
}

export class SidecarError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "SidecarError";
  }
}

export async function callSidecar<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`${sidecarBase()}${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    let body: unknown = undefined;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const msg =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ?? `Sidecar error ${res.status}`;
    throw new SidecarError(msg, res.status);
  }
  return (await res.json()) as T;
}

export interface SkillCallRequest {
  skillSlug: string;
  params: unknown;
  apiKey: string;
  locale: "en" | "fr";
}

export async function callSkill<T>(req: SkillCallRequest): Promise<T> {
  return callSidecar<T>(`/api/claude/${req.skillSlug}`, {
    method: "POST",
    body: { params: req.params, apiKey: req.apiKey, locale: req.locale },
  });
}

// Tests an Anthropic API key with a 1-token ping. The sidecar makes the
// actual API call so the key never reaches DevTools network logs.
export interface TestKeyResult {
  ok: boolean;
  model?: string;
  status?: number;
  error?: string;
  keyPrefix?: string;
  keyLength?: number;
  startsRight?: boolean;
  hint?: string;
}

export async function testApiKey(apiKey: string): Promise<TestKeyResult> {
  return callSidecar<TestKeyResult>("/api/claude/test", {
    method: "POST",
    body: { apiKey },
  });
}
