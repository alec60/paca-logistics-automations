import { PackageSearch } from "lucide-react";
import { ShippersParams, ShippersResult } from "./schemas";
import { ParamView } from "./ParamView";
import { ResultView } from "./ResultView";
import { handle } from "./handler";
import type { SkillManifest } from "../../core/types";

export const SHIPPERS_SLUG = "shippers";

const manifest: SkillManifest<ShippersParams, ShippersResult> = {
  slug: SHIPPERS_SLUG,
  name: {
    en: "Shipper lead finder",
    fr: "Recherche d'expéditeurs",
  },
  description: {
    en: "Find Canadian businesses that need freight hauled — your next brokerage customers.",
    fr: "Trouvez des entreprises canadiennes qui ont du fret à transporter — vos futurs clients.",
  },
  icon: PackageSearch,
  paramsSchema: ShippersParams,
  resultSchema: ShippersResult,
  ParamView,
  ResultView,
  // Adapter: the sidecar session (registered after lock-screen unlock) holds
  // the apiKey now — the handler doesn't need it in its inputs.
  handler: async (params, ctx) => handle(params, { locale: ctx.locale }),
};

export default manifest;
