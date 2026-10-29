import type { Plan, PlanId } from "./types";

/**
 * Plan entitlements, priced per owning account rather than per seat. The plan's workspace
 * features (analytics history, CSV export) apply to every workspace the account owns, for all of
 * its members. Changing an account's plan never touches memberships.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "Free", priceMonthlyUsd: 0, workspaceCreationLimit: 1, analyticsHistoryDays: 30, csvExport: false },
  pro: { id: "pro", name: "Pro", priceMonthlyUsd: 29, workspaceCreationLimit: 5, analyticsHistoryDays: 365, csvExport: true },
  agency: { id: "agency", name: "Agency", priceMonthlyUsd: 99, workspaceCreationLimit: 25, analyticsHistoryDays: 365, csvExport: true },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "agency"];

export function planFeatures(plan: Plan) {
  const n = plan.workspaceCreationLimit;
  return [
    n === 1 ? "Own 1 workspace" : `Own up to ${n} workspaces`,
    "Unlimited teammates",
    plan.analyticsHistoryDays >= 365 ? "12 months of analytics" : `${plan.analyticsHistoryDays} days of analytics`,
    ...(plan.csvExport ? ["CSV report exports"] : []),
  ];
}
