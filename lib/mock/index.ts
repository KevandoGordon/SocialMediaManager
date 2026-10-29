/**
 * Seed data for the mock API. Only lib/data/api.ts may import from here; pages and components
 * always go through the API so the workspace and permission checks apply.
 */
import { accounts as kestrelAccounts } from "./accounts";
import { buildDaily, buildPostMetrics } from "./analytics";
import { inbox as kestrelInbox } from "./inbox";
import { media as kestrelMedia } from "./media";
import { mentions as kestrelMentions } from "./mentions";
import { otherAccounts, otherInbox, otherMedia, otherMentions, otherPosts } from "./other-workspaces";
import { posts as kestrelPosts } from "./posts";
import { ATLAS, LUMEN, KESTREL } from "./workspaces";

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

export const accounts = [...kestrelAccounts, ...otherAccounts];
export const posts = [...kestrelPosts, ...otherPosts];
export const media = [...kestrelMedia, ...otherMedia];
export const inbox = [...kestrelInbox, ...otherInbox];
export const mentions = [...kestrelMentions, ...otherMentions];

export const dailyMetrics = [
  ...buildDaily(KESTREL, accounts, 42),
  ...buildDaily(LUMEN, accounts, 43),
  ...buildDaily(ATLAS, accounts, 44),
];
export const postMetrics = buildPostMetrics(posts, 7);
