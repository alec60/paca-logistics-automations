import { Truck } from "lucide-react";
import { LeadsParams, LeadsResult } from "./schemas";
import { ParamView } from "./ParamView";
import { ResultView } from "./ResultView";
import { handle } from "./handler";
import type { SkillManifest } from "../../core/types";

export const LEADS_SLUG = "leads";

const manifest: SkillManifest<LeadsParams, LeadsResult> = {
  slug: LEADS_SLUG,
  name: {
    en: "Carrier lead finder",
    fr: "Recherche de transporteurs",
  },
  description: {
    en: "Generate Canadian trucking carrier leads.",
    fr: "Génère des pistes de transporteurs canadiens.",
  },
  icon: Truck,
  paramsSchema: LeadsParams,
  resultSchema: LeadsResult,
  ParamView,
  ResultView,
  // Adapter: SkillContext is passed by the runner; here we read the apiKey + locale
  // off the ambient hook layer. The runner already injects these via callSidecar.
  handler: async (params, ctx) => {
    const apiKey = (ctx as unknown as { apiKey?: string }).apiKey ?? "";
    return handle(params, { apiKey, locale: ctx.locale });
  },
};

export default manifest;
