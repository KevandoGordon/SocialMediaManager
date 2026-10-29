import type {
  PlanId,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMembership,
  WorkspaceSettings,
} from "../../lib/types";
import { at, minutesAgo } from "./helpers";

export const KESTREL = "ws_kestrel";
export const LUMEN = "ws_lumen";
export const ATLAS = "ws_atlas";
export const HARBOR = "ws_harbor";

export const workspaces: Workspace[] = [
  { id: KESTREL, name: "Kestrel Studio", color: "#5b4bf5", ownerUserId: "u1", createdAt: at(-400) },
  { id: LUMEN, name: "Lumen Coffee", color: "#b45309", ownerUserId: "u7", createdAt: at(-200) },
  { id: ATLAS, name: "Atlas Outdoor", color: "#15803d", ownerUserId: "u8", createdAt: at(-150) },
  { id: HARBOR, name: "Harbor Health", color: "#0e7490", ownerUserId: "u2", createdAt: at(-2) },
];

/**
 * Jordan (u1) shows the spec's example: Admin of Kestrel Studio (owned), Editor at Lumen, Viewer at Atlas,
 * with a pending invitation to Harbor. Sam (u9) belongs to nothing yet and has an invitation waiting.
 */
export const memberships: WorkspaceMembership[] = [
  { id: "wm1", workspaceId: KESTREL, userId: "u1", role: "Admin", joinedAt: at(-400) },
  { id: "wm2", workspaceId: KESTREL, userId: "u2", role: "Manager", joinedAt: at(-380) },
  { id: "wm3", workspaceId: KESTREL, userId: "u3", role: "Editor", joinedAt: at(-300) },
  { id: "wm4", workspaceId: KESTREL, userId: "u4", role: "Editor", joinedAt: at(-250) },
  { id: "wm5", workspaceId: KESTREL, userId: "u5", role: "Viewer", joinedAt: at(-120) },
  { id: "wm6", workspaceId: KESTREL, userId: "u6", role: "Editor", joinedAt: at(-90) },

  { id: "wm7", workspaceId: LUMEN, userId: "u7", role: "Admin", joinedAt: at(-200) },
  { id: "wm8", workspaceId: LUMEN, userId: "u1", role: "Editor", joinedAt: at(-180) },
  { id: "wm9", workspaceId: LUMEN, userId: "u4", role: "Manager", joinedAt: at(-170) },
  { id: "wm10", workspaceId: LUMEN, userId: "u6", role: "Viewer", joinedAt: at(-60) },

  { id: "wm11", workspaceId: ATLAS, userId: "u8", role: "Admin", joinedAt: at(-150) },
  { id: "wm12", workspaceId: ATLAS, userId: "u2", role: "Admin", joinedAt: at(-140) },
  { id: "wm13", workspaceId: ATLAS, userId: "u1", role: "Viewer", joinedAt: at(-100) },
  { id: "wm14", workspaceId: ATLAS, userId: "u3", role: "Editor", joinedAt: at(-80) },

  { id: "wm15", workspaceId: HARBOR, userId: "u2", role: "Admin", joinedAt: at(-2) },
];

const DAY = 24 * 60;

export const invitations: WorkspaceInvitation[] = [
  { id: "inv1", workspaceId: HARBOR, email: "jordan@kestrelstudio.example", role: "Manager", invitedByUserId: "u2", status: "pending", createdAt: minutesAgo(DAY), expiresAt: at(6), lastSentAt: minutesAgo(DAY), sendCount: 1, respondedAt: null },
  { id: "inv2", workspaceId: KESTREL, email: "sam@example.com", role: "Editor", invitedByUserId: "u1", status: "pending", createdAt: minutesAgo(DAY * 2), expiresAt: at(5), lastSentAt: minutesAgo(DAY * 2), sendCount: 1, respondedAt: null },
  { id: "inv3", workspaceId: KESTREL, email: "alex@freelance.example", role: "Viewer", invitedByUserId: "u2", status: "pending", createdAt: minutesAgo(300), expiresAt: at(7), lastSentAt: minutesAgo(300), sendCount: 1, respondedAt: null },
  // Pending in storage but past its expiry: the API reports it as "expired".
  { id: "inv4", workspaceId: KESTREL, email: "nina@studio.example", role: "Editor", invitedByUserId: "u1", status: "pending", createdAt: minutesAgo(DAY * 12), expiresAt: at(-5), lastSentAt: minutesAgo(DAY * 12), sendCount: 1, respondedAt: null },
  { id: "inv5", workspaceId: KESTREL, email: "omar@contractor.example", role: "Editor", invitedByUserId: "u1", status: "revoked", createdAt: minutesAgo(DAY * 20), expiresAt: at(-13), lastSentAt: minutesAgo(DAY * 20), sendCount: 1, respondedAt: minutesAgo(DAY * 18) },
  { id: "inv6", workspaceId: LUMEN, email: "priya@kestrelstudio.example", role: "Viewer", invitedByUserId: "u7", status: "pending", createdAt: minutesAgo(DAY * 3), expiresAt: at(4), lastSentAt: minutesAgo(DAY * 3), sendCount: 1, respondedAt: null },
];

/** Billing entitlement per account; anyone not listed is on Free. */
export const accountPlans: Record<string, PlanId> = { u1: "pro", u8: "agency" };

export const workspaceSettings: Record<string, WorkspaceSettings> = {
  [KESTREL]: { timezone: "America/New_York", weekStartsOn: 1, requireApproval: true, defaultNetworks: ["instagram", "facebook", "linkedin"] },
  [LUMEN]: { timezone: "America/Los_Angeles", weekStartsOn: 0, requireApproval: true, defaultNetworks: ["instagram", "tiktok"] },
  [ATLAS]: { timezone: "America/Denver", weekStartsOn: 1, requireApproval: false, defaultNetworks: ["instagram", "youtube", "pinterest"] },
  [HARBOR]: { timezone: "America/Chicago", weekStartsOn: 1, requireApproval: true, defaultNetworks: ["facebook", "linkedin"] },
};

export { DEFAULT_NOTIFICATIONS } from "../../lib/defaults";
