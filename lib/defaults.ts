import { NETWORK_IDS } from "./networks";
import type { Account, NotificationPrefs } from "./types";

/** Applied until a user saves their own preferences. */
export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  approvalRequests: true,
  approvalDecisions: true,
  newMessages: true,
  negativeMentions: true,
  weeklyReport: false,
  channel: "both",
};

/** One disconnected slot per network, created with every workspace. Connecting fills it in. */
export function placeholderAccounts(workspaceId: string, name: string, idPrefix: string): Account[] {
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return NETWORK_IDS.map((network, i) => ({
    id: `${idPrefix}${i + 1}`,
    workspaceId,
    network,
    name,
    handle: `@${handle}`,
    connected: false,
    followers: 0,
    lastSync: null,
  }));
}
