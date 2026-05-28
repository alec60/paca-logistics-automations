// Frontend Claude client.
//
// Session protocol:
//   1. After the lock screen unlocks the apiKey, call registerSession(apiKey)
//      once. The sidecar stores the key in process memory and returns a
//      short-lived bearer token.
//   2. Subsequent calls (skill handler -> /api/claude/messages) send only
//      X-Session-Token. The apiKey itself never crosses the loopback again.
//   3. On a 401 the client auto-re-registers and retries once. If that also
//      fails the caller sees the original error.

const DEFAULT_SIDECAR_PORT = 19191;

function sidecarBase(): string {
  const port =
    (window as unknown as { __TP_SIDECAR_PORT__?: number }).__TP_SIDECAR_PORT__ ??
    DEFAULT_SIDECAR_PORT;
  return `http://127.0.0.1:${port}`;
}

let sessionToken: string | null = null;
let cachedApiKey: string | null = null; // kept only to re-register on 401

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

export async function registerSession(apiKey: string): Promise<void> {
  cachedApiKey = apiKey;
  const { sessionToken: token } = await rawFetch<{ sessionToken: string }>(
    "/api/auth/register",
    { method: "POST", body: { apiKey } },
  );
  sessionToken = token;
}

export async function logoutSession(): Promise<void> {
  if (!sessionToken) return;
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
  if (!sessionToken && cachedApiKey) {
    await registerSession(cachedApiKey);
  }
  try {
    return await rawFetch<T>(path, { ...init, token: sessionToken });
  } catch (err) {
    if (err instanceof SidecarError && err.status === 401 && cachedApiKey) {
      // Session expired or sidecar restarted — re-register and retry once.
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
