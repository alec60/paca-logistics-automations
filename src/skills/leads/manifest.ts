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
  // Adapter: the sidecar session (registered after lock-screen unlock) holds
  // the apiKey now — the handler doesn't need it in its inputs.
  handler: async (params, ctx) => handle(params, { locale: ctx.locale }),
};

export default manifest;
