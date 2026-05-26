// Lazy singletons for blacklist + budget APIs. Calling code reads these
// instead of constructing fresh adapters per call.
import { createBlacklistApi } from "./blacklist";
import { createBudgetApi } from "./budget";

export const blacklistApi = createBlacklistApi();
export const budgetApi = createBudgetApi();
