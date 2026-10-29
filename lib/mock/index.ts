/**
 * Seed data for the mock API. Only lib/data/api.ts may import from here; pages and components
 * always go through the API so the workspace and permission checks apply.
 */
import { accounts as northwindAccounts } from "./accounts";
import { buildDaily, buildPostMetrics } from "./analytics";
import { inbox as northwindInbox } from "./inbox";
import { media as northwindMedia } from "./media";
import { mentions as northwindMentions } from "./mentions";
import { otherAccounts, otherInbox, otherMedia, otherMentions, otherPosts } from "./other-workspaces";
import { posts as northwindPosts } from "./posts";
import { ATLAS, LUMEN, NORTHWIND } from "./workspaces";

export { users } from "./users";
export {
  workspaces,
  memberships,
  invitations,
  accountPlans,
  workspaceSettings,
  DEFAULT_NOTIFICATIONS,
} from "./workspaces";
export { placeholderAccounts } from "./other-workspaces";

export const accounts = [...northwindAccounts, ...otherAccounts];
export const posts = [...northwindPosts, ...otherPosts];
export const media = [...northwindMedia, ...otherMedia];
export const inbox = [...northwindInbox, ...otherInbox];
export const mentions = [...northwindMentions, ...otherMentions];

export const dailyMetrics = [
  ...buildDaily(NORTHWIND, accounts, 42),
  ...buildDaily(LUMEN, accounts, 43),
  ...buildDaily(ATLAS, accounts, 44),
];
export const postMetrics = buildPostMetrics(posts, 7);
