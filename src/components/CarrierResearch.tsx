// "Extra research" button shown per pulled lead. Click → a popover asking for
// optional special instructions (blank = dig deeper into the company), then runs
// a web_search-backed deep dive and renders the Markdown briefing inline.
import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Sparkles, Loader2, X, Search } from "lucide-react";
import { useSettingsStore } from "../core/settings-store";
import { researchCarrier } from "../skills/leads/research";
import type { Carrier } from "../skills/leads/schemas";
import { cn } from "../lib/utils";

function resolveTheme(theme: string): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function CarrierResearch({ carrier }: { carrier: Carrier }) {
  const theme = useSettingsStore((s) => s.theme);
  const fr = useSettingsStore((s) => s.locale) === "fr";
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const r = await researchCarrier(carrier, instructions, fr ? "fr" : "en");
      setResult(r.markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={fr ? "Recherche approfondie" : "Deep research"}
          aria-label={fr ? "Recherche approfondie" : "Deep research"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-3 hover:text-accent"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          data-theme={resolveTheme(theme)}
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[28rem] max-w-[92vw] rounded-lg border border-border-subtle bg-menu-bg p-3 text-sm text-input-text shadow-soft-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-4 w-4 text-accent" />
              {fr ? "Recherche" : "Research"}: {carrier.company}
            </span>
            <Popover.Close
              aria-label={fr ? "Fermer" : "Close"}
              className="text-text-dim hover:text-text"
            >
              <X className="h-4 w-4" />
            </Popover.Close>
          </div>

          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder={
              fr
                ? "Instructions (optionnel) — vide = approfondir l'entreprise"
                : "Special instructions (optional) — blank = dig deeper into the company"
            }
            className="w-full resize-none rounded-md border border-border-subtle bg-input-bg px-2.5 py-1.5 text-xs text-input-text placeholder:text-input-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          />

          <div className="mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                loading
                  ? "bg-surface-2 text-text-dim"
                  : "bg-gradient-accent text-accent-text hover:brightness-110",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {fr ? "Recherche…" : "Researching…"}
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  {result ? (fr ? "Relancer" : "Re-run") : fr ? "Lancer" : "Run"}
                </>
              )}
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-danger">{error}</p>}

          {result && (
            <div className="mt-2 max-h-80 overflow-y-auto rounded-md bg-surface-1 p-2.5">
              <ResearchMarkdown text={result} />
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---- minimal, safe Markdown renderer (headings / bullets / bold / links) ----
function inline(s: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    if (m[1] != null) {
      nodes.push(
        <strong key={k++} className="font-semibold text-text">
          {m[1]}
        </strong>,
      );
    } else if (m[2] != null) {
      nodes.push(
        <a key={k++} href={m[3]} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {m[2]}
        </a>,
      );
    } else if (m[4] != null) {
      nodes.push(
        <a key={k++} href={m[4]} target="_blank" rel="noopener noreferrer" className="break-all text-accent hover:underline">
          {m[4]}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return nodes;
}

function ResearchMarkdown({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`u${out.length}`} className="mb-1.5 ml-4 list-disc space-y-0.5">
          {bullets}
        </ul>,
      );
      bullets = [];
    }
  };
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      flush();
      return;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      out.push(
        <div key={`h${i}`} className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-text first:mt-0">
          {inline(h[2])}
        </div>,
      );
      return;
    }
    const b = line.match(/^[-*]\s+(.*)$/);
    if (b) {
      bullets.push(<li key={`l${i}`}>{inline(b[1])}</li>);
      return;
    }
    flush();
    out.push(
      <p key={`p${i}`} className="mb-1">
        {inline(line)}
      </p>,
    );
  });
  flush();
  return <div className="text-xs leading-relaxed text-text-muted">{out}</div>;
}
