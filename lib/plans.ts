import type { Plan, PlanId } from "./types";

/**
 * Plan entitlements. Only the free tier exists today; paid tiers are intentionally not defined
 * until pricing is decided. Adding one is a new entry here plus a billing record pointing at it;
 * the membership model doesn't change.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "Free", workspaceCreationLimit: 1 },
};
