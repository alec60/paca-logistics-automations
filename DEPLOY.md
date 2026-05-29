# Deploying Transport Paca to GitHub Pages (free, Mac-friendly)

This guide walks through publishing the app as a **Progressive Web App** on GitHub Pages. Result: every teammate (Mac, Windows, Linux) can open a URL in Chrome / Edge / Safari, hit **"Install app"**, and get a real standalone window with a Dock icon — no Tauri build needed, no per-OS installer.

This is the right path for the team because:

- **Free.** GitHub Pages + Cloudflare (optional) are free for this traffic.
- **Cross-platform.** Same URL works on every OS. PWA install gives Mac users an `.app`-like experience.
- **No code-signing dance.** Tauri's signed `.msi` flow is great for Windows but a pain to ship for Mac (Apple developer account + notarization, ~$99/yr).
- **Updates are automatic.** New deploy = new version on next page load.

What you lose vs. the Tauri build: SQLite history (browser doesn't have `tauri-plugin-sql`). The app already falls back to localStorage for history (we wired that up earlier), so this is mostly transparent.

---

## Part 1 — One-time repo setup

You're doing all of this from this repo. None of it touches the Tauri build, so you can keep shipping `.msi` alongside.

### 1.1 Install the PWA Vite plugin

```bash
pnpm add -D vite-plugin-pwa
```

### 1.2 Patch `vite.config.ts`

Open `vite.config.ts` and replace the plugins array:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  // GitHub Pages serves at https://<user>.github.io/<repo>/. The base path
  // must match the repo name OR you must use a custom domain (see Part 4).
  base: process.env.GITHUB_PAGES === "1" ? "/paca-logistics-automations/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.svg"],
      manifest: {
        name: "Transport Paca",
        short_name: "Paca",
        description: "Carrier intelligence for Transport Paca.",
        theme_color: "#161a26",
        background_color: "#161a26",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
```

### 1.3 Skip the sidecar — add a direct-mode Anthropic client

The Express sidecar runs on `127.0.0.1` on the user's machine. GitHub Pages can't run it. Two clean choices:

- **Direct from browser (easiest, what this guide uses).** Use the Anthropic SDK with `dangerouslyAllowBrowser: true`. Each teammate enters their own API key (already the model). Caveat: the key is visible in the user's own DevTools network tab while in use. Same as the desktop build — no worse.
- **Cloudflare Worker proxy (cleaner, ~1 hour).** A tiny Worker holds the key for everyone and forwards to Anthropic. Best for one shared key. See **Part 5**.

For now, in `src/core/claude-client.ts`, swap the `callSidecar` impl when we detect we're on a non-sidecar build. The detection: if `fetch('/healthz')` fails on first call. Easier route: a build-time flag.

Add a Vite env var in `.env.production`:

```
VITE_DIRECT_ANTHROPIC=1
```

Then in `src/core/claude-client.ts`, branch inside `callSidecar`:

```ts
if (import.meta.env.VITE_DIRECT_ANTHROPIC === "1") {
  // Direct browser call to Anthropic. The session token is irrelevant here;
  // we use the plaintext apiKey held in runtime-secrets.
  const { useRuntimeSecrets } = await import("./runtime-secrets");
  const apiKey = useRuntimeSecrets.getState().apiKey;
  const url = "https://api.anthropic.com" + path.replace(/^\/api\/claude/, "/v1");
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  // ...handle response
}
```

(I haven't shipped this in the repo yet — it's intentionally left as a guided step. Tell me when you want me to wire it.)

### 1.4 GitHub Actions workflow for Pages

Create `.github/workflows/pages.yml`:

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Build (GitHub Pages base path)
        env:
          GITHUB_PAGES: "1"
          VITE_DIRECT_ANTHROPIC: "1"
        run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 1.5 Enable Pages in the repo

GitHub → Settings → Pages → Source = **GitHub Actions**.

Push to `main`. Wait ~2 minutes. URL appears at the top of the Pages settings.

---

## Part 2 — Teammates install it on Mac

Send them the URL. Each one does this once:

1. Open the URL in **Chrome** or **Edge** (Safari works for some PWAs but is the worst-supported — recommend Chrome).
2. Address bar → **Install icon** (the `⊕` to the right of the URL) → **Install**.
   - Or: View menu → Install Transport Paca…
3. App opens in its own window. It's pinned to the Dock; right-click → Options → Keep in Dock for permanence.
4. Done. They double-click the Dock icon like any other Mac app.

**Updates are automatic** — `registerType: "autoUpdate"` from the PWA plugin checks for new builds in the background.

**Quick "install" diagnostic:** if there's no Install button, the manifest didn't load or HTTPS isn't on. GitHub Pages is HTTPS by default so this usually means a missing `manifest.webmanifest`.

---

## Part 3 — First-launch for each teammate

When the app opens:

1. **Settings** page (auto-redirected because no API key yet). They paste their Anthropic API key + Confirm.
2. They land on the leads page. Done.

There is no passcode prompt — the app opens straight in. Note this means anyone with the machine has full access to its data; physical/OS-level security is the only gate now.

**Shared blacklist / pinned cities across the team** is not automatic on GitHub Pages — each install has its own localStorage. Three options, in increasing complexity:

- **Manual JSON sharing** (already shipped). Settings → Export JSON, share via Slack/Drive, others import.
- **Cloudflare KV backend** — see Part 5.
- **Telegram bot for notifications** — see Part 6.

---

## Part 4 — (Optional) Custom domain

If you own `transportpaca.com`:

1. Settings → Pages → Custom domain → enter it.
2. Add `CNAME alec60.github.io.` at your DNS provider (or `A 185.199.108-111.153` records).
3. Wait for HTTPS provisioning (~15 min).
4. Change `base` in `vite.config.ts` back to `"/"` (custom domain is at the root).

---

## Part 5 — (Optional) Cloudflare Worker shared backend

If you want **one shared API key** across the team plus a sync surface for pins / blacklist / history:

1. **Sign up at Cloudflare** (free).
2. **Create a Worker** — paste this:

```js
// worker.js — minimal Anthropic proxy + KV store.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Simple shared-secret auth — set TEAM_TOKEN in Worker env vars and store
    // the same value in localStorage under "team-token" in the app.
    if (req.headers.get("x-team-token") !== env.TEAM_TOKEN) {
      return new Response("forbidden", { status: 403 });
    }

    if (url.pathname === "/v1/messages" && req.method === "POST") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_KEY,   // stored in Worker env, never in the app
          "anthropic-version": "2023-06-01",
        },
        body: await req.text(),
      });
      return new Response(res.body, {
        status: res.status,
        headers: res.headers,
      });
    }

    // KV-backed shared blacklist
    if (url.pathname === "/blacklist" && req.method === "GET") {
      const raw = await env.PACA.get("blacklist");
      return Response.json(raw ? JSON.parse(raw) : []);
    }
    if (url.pathname === "/blacklist" && req.method === "PUT") {
      await env.PACA.put("blacklist", await req.text());
      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  },
};
```

3. **In Worker dashboard** → Variables → add `TEAM_TOKEN` (random string) and `ANTHROPIC_KEY` (your real key).
4. **Bind a KV namespace** → name it `PACA`.
5. **Note the Worker URL** (e.g. `https://transport-paca.<you>.workers.dev`).
6. **Point the app at it** — wire `claude-client.ts` to call the Worker URL instead of Anthropic when `VITE_USE_WORKER` is set.

Now the team shares one Anthropic key, the blacklist is live across devices, and pin/history sync becomes a few more KV endpoints.

I can wire steps 1.3 + Part 5 for you whenever you're ready — it's a focused ~1-hour follow-up.

---

## Part 6 — (Optional) WhatsApp-style notifications

**Why not WhatsApp directly:** the WhatsApp Business Cloud API requires a Meta Business account, phone-number verification with Meta, a $0.005/msg fee, and ~$30/mo+ for any meaningful volume. Not free, not 1-click.

**Free equivalent: Telegram bot.** Same instant-on-your-phone feel. Five-minute setup.

1. On your phone, open Telegram → search **@BotFather** → `/newbot` → name it. You get a **bot token**.
2. Send any message to your bot, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser. Find your `chat.id` (an integer).
3. Add both to the app's Settings → Developer card (we'll add a "Notify on Telegram" toggle in a follow-up commit).
4. The app calls:

```ts
await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: chatId, text: "Blacklisted Test Carrier Inc." }),
});
```

For every blacklist/pin/history event, you get a push notification on your phone. Free, no signup beyond a Telegram account.

The current audit log (see DevPanel) already records the events — wiring them to Telegram is a 30-line change. **Tell me when you want it.**

---

## Part 7 — Quick checklist

- [ ] `pnpm add -D vite-plugin-pwa`
- [ ] Patch `vite.config.ts` (Part 1.2)
- [ ] Add `.env.production` with `VITE_DIRECT_ANTHROPIC=1`
- [ ] Wire `claude-client.ts` direct-mode branch (Part 1.3) — *or ask me to do it*
- [ ] Commit `.github/workflows/pages.yml`
- [ ] Repo Settings → Pages → Source = GitHub Actions
- [ ] Push to `main`, wait for the Action to go green
- [ ] Open the URL on Mac, hit **Install**
- [ ] (Optional) Custom domain — Part 4
- [ ] (Optional) Cloudflare Worker for shared state — Part 5
- [ ] (Optional) Telegram bot for notifications — Part 6

When you've done steps 1-6 and want me to wire the direct-mode Anthropic client (1.3), say **"wire direct mode"**. When you want Telegram alerts, say **"wire Telegram"**.
