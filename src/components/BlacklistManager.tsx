// Phase 2 wires this to the BlacklistAPI. Phase 1 ships a typed stub.
import { useTranslation } from "react-i18next";
import { EmptyState } from "./EmptyState";
import { Layers } from "lucide-react";

export function BlacklistManager() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Layers}
      title={t("blacklist.manager")}
      description={t("blacklist.empty")}
    />
  );
}
