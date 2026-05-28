// Collapsible blacklist section embedded inside the leads ParamView. Lives
// here (not under /settings) because the blacklist is automation-specific —
// it filters the carriers this skill returns. Future skills that work with
// company data can mount this same component.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Ban } from "lucide-react";
import { BlacklistManager } from "./BlacklistManager";
import { blacklistApi } from "../core/context";

export function BlacklistSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await blacklistApi.list();
        if (alive) setCount(list.length);
      } catch {
        if (alive) setCount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 text-left hover:bg-surface-2"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Ban className="h-4 w-4 text-text-muted" />
          {t("settings.blacklist")}
          <span className="rounded-pill bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-text-muted">
            {count}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {open && (
        <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <BlacklistManager />
        </div>
      )}
    </section>
  );
}
