// Frontend Claude client. Two runtime modes:
//
// 1. Sidecar mode (Tauri desktop build, default in dev). After unlock we POST
//    /api/auth/register once; the sidecar stores the apiKey in memory and
//    returns a session token used as X-Session-Token. The plaintext key never
//    crosses loopback again.
//
// 2. Direct mode (web build / GitHub Pages, VITE_DIRECT_ANTHROPIC=1). There
//    is no sidecar. callSidecar(path, init) routes the /api/claude/messages
//    request straight to api.anthropic.com using the apiKey held in memory by
//    runtime-secrets. The key IS visible in the user's own DevTools network
//    tab while a request is in flight — same trade-off as the Tauri shell.

const DEFAULT_SIDECAR_PORT = 19191;
const DIRECT_MODE =
  typeof import.meta !== "undefined" &&
  (import.meta.env?.VITE_DIRECT_ANTHROPIC === "1" ||
    import.meta.env?.VITE_DIRECT_ANTHROPIC === true);

function sidecarBase(): string {
  const port =
    (window as unknown as { __TP_SIDECAR_PORT__?: number }).__TP_SIDECAR_PORT__ ??
    DEFAULT_SIDECAR_PORT;
  return `http://127.0.0.1:${port}`;
}

let sessionToken: string | null = null;
let cachedApiKey: string | null = null;

export class SidecarError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "SidecarError";
  }
}

async function rawFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown; token?: string | null },
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init?.token) headers["X-Session-Token"] = init.token;
  const res = await fetch(`${sidecarBase()}${path}`, {
    method: init?.method ?? "GET",
    headers,
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

// ─────────── Direct (browser → Anthropic) ───────────

async function rawAnthropic<T>(
  pathOrUrl: string,
  init: { method?: string; body?: unknown; apiKey: string },
): Promise<T> {
  // Map /api/claude/messages → https://api.anthropic.com/v1/messages
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : "https://api.anthropic.com/v1" +
      pathOrUrl.replace(/^\/api\/claude/, "").replace(/^\/$/, "/messages");
  const res = await fetch(url, {
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": init.apiKey,
      "anthropic-version": "2023-06-01",
      // Required for browser-origin calls; documented in Anthropic SDK.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
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
        ? typeof (body as { error: unknown }).error === "object"
          ? JSON.stringify((body as { error: unknown }).error)
          : String((body as { error: unknown }).error)
        : null) ?? `Anthropic error ${res.status}`;
    throw new SidecarError(msg, res.status);
  }
  return (await res.json()) as T;
}

// ─────────── Public surface ───────────

export async function registerSession(apiKey: string): Promise<void> {
  cachedApiKey = apiKey;
  if (DIRECT_MODE) {
    // No session — the apiKey lives in cachedApiKey and runtime-secrets.
    sessionToken = "direct-mode";
    return;
  }
  const { sessionToken: token } = await rawFetch<{ sessionToken: string }>(
    "/api/auth/register",
    { method: "POST", body: { apiKey } },
  );
  sessionToken = token;
}

export async function logoutSession(): Promise<void> {
  if (!sessionToken) return;
  if (DIRECT_MODE) {
    sessionToken = null;
    cachedApiKey = null;
    return;
  }
  try {
    await rawFetch("/api/auth/logout", { method: "POST", token: sessionToken });
  } catch {
    /* best effort */
  }
  sessionToken = null;
  cachedApiKey = null;
}

export function hasSession(): boolean {
  return !!sessionToken;
}

async function callWithSession<T>(
  path: string,
  init: { method?: string; body?: unknown },
): Promise<T> {
  if (DIRECT_MODE) {
    if (!cachedApiKey) throw new SidecarError("No API key — unlock first.", 401);
    // Only /api/claude/messages is supported in direct mode; other paths
    // would need their own mapping.
    const reqBody = (init.body as { request?: unknown })?.request ?? init.body;
    return rawAnthropic<T>(path, {
      method: init.method ?? "POST",
      body: reqBody,
      apiKey: cachedApiKey,
    });
  }
  if (!sessionToken && cachedApiKey) {
    await registerSession(cachedApiKey);
  }
  try {
    return await rawFetch<T>(path, { ...init, token: sessionToken });
  } catch (err) {
    if (err instanceof SidecarError && err.status === 401 && cachedApiKey) {
      sessionToken = null;
      await registerSession(cachedApiKey);
      return await rawFetch<T>(path, { ...init, token: sessionToken });
    }
    throw err;
  }
}

/** Bypasses the session flow — Settings hits this before registering. */
export async function callSidecarUnauth<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  if (DIRECT_MODE && path === "/api/claude/test") {
    // Direct test: minimal ping straight to Anthropic with the supplied key.
    const { apiKey } = (init?.body ?? {}) as { apiKey?: string };
    if (!apiKey) return { ok: false, error: "missing apiKey" } as T;
    const trimmed = apiKey.trim();
    const startsRight = trimmed.startsWith("sk-ant-");
    try {
      const msg = await rawAnthropic<{ model: string }>("/v1/messages", {
        method: "POST",
        apiKey: trimmed,
        body: {
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        },
      });
      return {
        ok: true,
        model: msg.model,
        keyLength: trimmed.length,
        startsRight,
      } as T;
    } catch (err) {
      const e = err as { status?: number; message?: string };
      const status = e.status ?? 500;
      const hint =
        status === 401
          ? startsRight
            ? "Key was rejected. Check console.anthropic.com → Settings → API Keys and billing."
            : "Key doesn't start with 'sk-ant-'. Anthropic API keys come from console.anthropic.com, not claude.ai."
          : undefined;
      return {
        ok: false,
        status,
        error: e.message ?? "Anthropic error",
        keyLength: trimmed.length,
        startsRight,
        hint,
      } as T;
    }
  }
  return rawFetch<T>(path, init);
}

/** Authenticated proxy call. apiKey never crosses the wire after register. */
export async function callSidecar<T>(
  path: string,
  init: { method?: string; body?: unknown },
): Promise<T> {
  return callWithSession<T>(path, init);
}

// ─────────── /api/claude/test (no session) ───────────

export interface TestKeyResult {
  ok: boolean;
  model?: string;
  status?: number;
  error?: string;
  keyLength?: number;
  startsRight?: boolean;
  hint?: string;
}

export async function testApiKey(apiKey: string): Promise<TestKeyResult> {
  return callSidecarUnauth<TestKeyResult>("/api/claude/test", {
    method: "POST",
    body: { apiKey },
  });
}
