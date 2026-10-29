/**
 * Sample data for the automated tests only. The app itself starts empty; tests load this into the
 * API with loadStateForTests(fixtureState()).
 */
import { hashPassword } from "../../lib/server/crypto";
import { emptyState, type State } from "../../lib/server/state";
import { accounts as kestrelAccounts } from "./accounts";
import { buildDaily, buildPostMetrics } from "./analytics";
import { inbox as kestrelInbox } from "./inbox";
import { media as kestrelMedia } from "./media";
import { mentions as kestrelMentions } from "./mentions";
import { otherAccounts, otherInbox, otherMedia, otherMentions, otherPosts } from "./other-workspaces";
import { posts as kestrelPosts } from "./posts";
import { ATLAS, LUMEN, KESTREL } from "./workspaces";

import { users } from "./users";
import { accountPlans, invitations, memberships, workspaces, workspaceSettings } from "./workspaces";

export { users, workspaces, memberships, invitations, accountPlans, workspaceSettings };

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

/** Every fixture user signs in with this password in the browser tests. */
export const FIXTURE_PASSWORD = "fixture-password";

/** The whole sample dataset as an API state, ready for replaceState(). */
export function fixtureState(): State {
  return {
    ...emptyState(),
    users,
    workspaces,
    memberships,
    invitations,
    accountPlans,
    workspaceSettings,
    posts,
    media,
    inbox,
    mentions,
    accounts,
    dailyMetrics,
    postMetrics,
    passwords: Object.fromEntries(users.map((u) => [u.id, hashPassword(FIXTURE_PASSWORD)])),
  };
}
