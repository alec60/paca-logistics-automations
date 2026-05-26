import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Trash2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { blacklistApi } from "../core/context";
import type { BlacklistEntry } from "../core/types";

export function BlacklistManager() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    setEntries(await blacklistApi.list());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add() {
    if (!draft.trim()) return;
    await blacklistApi.add(draft.trim(), reason.trim() || undefined);
    setDraft("");
    setReason("");
    await refresh();
  }

  async function remove(id: number) {
    await blacklistApi.remove(id);
    await refresh();
  }

  const filtered = entries.filter((e) =>
    e.company.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <section className="flex flex-col gap-3" aria-label={t("blacklist.manager")}>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("blacklist.add")}
          aria-label={t("blacklist.add")}
        />
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          aria-label="Reason"
          className="max-w-xs"
        />
        <Button onClick={add} type="button">
          {t("blacklist.add")}
        </Button>
      </div>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        aria-label="Filter blacklist"
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Layers} title={t("blacklist.empty")} />
      ) : (
        <ul className="divide-y divide-border-subtle rounded border border-border-subtle">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span>{e.company}</span>
                {e.reason && (
                  <span className="text-xs text-text-dim">{e.reason}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(e.id)}
                aria-label={`${t("blacklist.remove")} ${e.company}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
