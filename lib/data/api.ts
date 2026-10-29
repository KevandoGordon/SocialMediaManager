/**
 * Mock API. This module plays the part of the server: it owns the data, knows who is "signed in"
 * (a demo session, not real authentication), and authorizes every call. Pages never import mock
 * data directly; they call these functions through the store.
 *
 * Rules every workspace-scoped function follows, and a real backend must keep:
 * - The caller comes from the session, never from an argument.
 * - A workspaceId argument is only a request: membership is looked up server-side, and a
 *   non-member gets "not found" so workspace existence isn't leaked.
 * - Every record is fetched by (workspaceId, id), so an ID from another workspace is "not found".
 * - Permission checks use the stored membership role, not anything the client sends.
 *
 * Each handler's checks and writes run synchronously before the simulated network delay, so two
 * concurrent calls can't interleave between a check and its write (see createWorkspace).
 * Data lives in memory and resets on page reload. Nothing is emailed, connected or published.
 */
import { format, subDays } from "date-fns";
import * as seed from "../mock";
import { NETWORK_IDS } from "../networks";
import { assignableRoles, can, canDeletePost, canEditPost, PERMISSIONS, type Permission } from "../permissions";
import { PLANS } from "../plans";
import type {
  Account,
  Comment,
  DailyMetric,
  InboxItem,
  Member,
  MediaItem,
  Mention,
  MyInvitation,
  MyWorkspace,
  NetworkId,
  NotificationPrefs,
  PlanId,
  Post,
  PostMetrics,
  PostStatus,
  Role,
  Session,
  User,
  Workspace,
  WorkspaceInvitation,
  WorkspaceSettings,
} from "../types";
import { uid } from "../utils";
import { ApiError } from "./errors";

const db = {
  users: structuredClone(seed.users),
  workspaces: structuredClone(seed.workspaces),
  memberships: structuredClone(seed.memberships),
  invitations: structuredClone(seed.invitations),
  accountPlans: structuredClone(seed.accountPlans),
  workspaceSettings: structuredClone(seed.workspaceSettings),
  notificationPrefs: {} as Record<string, NotificationPrefs>,
  posts: structuredClone(seed.posts),
  media: structuredClone(seed.media),
  inbox: structuredClone(seed.inbox),
  mentions: structuredClone(seed.mentions),
  accounts: structuredClone(seed.accounts),
  dailyMetrics: structuredClone(seed.dailyMetrics),
  postMetrics: structuredClone(seed.postMetrics),
};

const LATENCY_MS = 120;
const INVITE_TTL_DAYS = 7;
const WORKSPACE_COLORS = ["#5b4bf5", "#0e7490", "#b45309", "#15803d", "#be185d", "#7c3aed", "#0369a1", "#a16207"];

/** Runs the handler now (atomically), then resolves or rejects after the simulated network delay. */
async function handle<T>(fn: () => T): Promise<T> {
  let result: T | undefined;
  let error: unknown;
  try {
    result = fn();
  } catch (e) {
    error = e;
  }
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  if (error) throw error;
  return structuredClone(result as T);
}

// ---------------------------------------------------------------------------
// Demo session (stands in for an auth cookie; replace with a real auth provider)

let sessionUserId: string | null = null;

/** DEMO ONLY: switch the simulated signed-in user. No password, no verification. */
export function demoSignIn(userId: string) {
  if (!db.users.some((u) => u.id === userId)) throw new ApiError("not_found", "Unknown demo user");
  sessionUserId = userId;
}

/** DEMO ONLY: the identities the demo sign-in menu offers. A real app has no such endpoint. */
export const listDemoIdentities = () => handle(() => db.users);

function requireUser(): User {
  const user = db.users.find((u) => u.id === sessionUserId);
  if (!user) throw new ApiError("unauthenticated", "You're signed out.");
  return user;
}

// ---------------------------------------------------------------------------
// Authorization helpers

const membershipOf = (workspaceId: string, userId: string) =>
  db.memberships.find((m) => m.workspaceId === workspaceId && m.userId === userId);

/** Resolves the caller's membership in a workspace and checks one permission against it. */
function authorize(workspaceId: string, permission: Permission) {
  const user = requireUser();
  const workspace = db.workspaces.find((w) => w.id === workspaceId);
  const membership = workspace && membershipOf(workspaceId, user.id);
  if (!workspace || !membership) throw new ApiError("not_found", "Workspace not found.");
  if (!can(membership.role, permission)) {
    throw new ApiError("forbidden", `As ${article(membership.role)} ${membership.role} you can't ${PERMISSIONS[permission].label.toLowerCase().replace(/ \(.*\)$/, "")}.`);
  }
  return { user, workspace, role: membership.role, settings: db.workspaceSettings[workspaceId] };
}

const article = (role: Role) => (role === "Admin" || role === "Editor" ? "an" : "a");

/** Fetches a record only if it belongs to the workspace; anything else is "not found". */
function scoped<T extends { id: string; workspaceId: string }>(list: T[], workspaceId: string, id: string, what: string): T {
  const item = list.find((x) => x.id === id && x.workspaceId === workspaceId);
  if (!item) throw new ApiError("not_found", `${what} not found.`);
  return item;
}

const inWs = <T extends { workspaceId: string }>(list: T[], workspaceId: string) => list.filter((x) => x.workspaceId === workspaceId);

const planFor = (userId: string) => PLANS[db.accountPlans[userId] ?? "free"];
/** Workspace features come from the owner's plan, whoever is asking. */
const workspacePlan = (workspace: Workspace) => planFor(workspace.ownerUserId);
const analyticsCutoff = (workspace: Workspace) => format(subDays(new Date(), workspacePlan(workspace).analyticsHistoryDays - 1), "yyyy-MM-dd");
const ownedCount = (userId: string) => db.workspaces.filter((w) => w.ownerUserId === userId).length;
const adminCount = (workspaceId: string) => db.memberships.filter((m) => m.workspaceId === workspaceId && m.role === "Admin").length;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Invitations are stored as pending; expiry is derived so it never depends on a background job. */
function effectiveInvitation(inv: WorkspaceInvitation): WorkspaceInvitation {
  return inv.status === "pending" && new Date(inv.expiresAt) < new Date() ? { ...inv, status: "expired" } : inv;
}

function cleanName(name: string, what: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 50) throw new ApiError("invalid", `${what} must be 2–50 characters.`);
  return trimmed;
}

/** Things that happen to a membership's footprint when it ends. */
function endMembership(workspaceId: string, userId: string) {
  db.memberships = db.memberships.filter((m) => !(m.workspaceId === workspaceId && m.userId === userId));
  for (const item of inWs(db.inbox, workspaceId)) if (item.assigneeId === userId) item.assigneeId = null;
}

// ---------------------------------------------------------------------------
// Account (user-level; independent of any workspace)

export const getSession = () =>
  handle<Session>(() => {
    const user = requireUser();
    return {
      user,
      plan: planFor(user.id),
      ownedWorkspaceCount: ownedCount(user.id),
      notifications: db.notificationPrefs[user.id] ?? seed.DEFAULT_NOTIFICATIONS,
    };
  });

export const updateProfile = (patch: { name?: string; title?: string }) =>
  handle(() => {
    const user = requireUser();
    if (patch.name !== undefined) user.name = cleanName(patch.name, "Name");
    if (patch.title !== undefined) user.title = patch.title.trim().slice(0, 80);
    return user;
  });

export const updateNotificationPrefs = (prefs: NotificationPrefs) =>
  handle(() => {
    const user = requireUser();
    db.notificationPrefs[user.id] = prefs;
    return prefs;
  });

/**
 * Simulated plan change: takes effect immediately and charges nothing. In production the plan is
 * only ever changed by the billing provider's webhook after checkout succeeds, never by the client.
 * A downgrade is refused while the account owns more workspaces than the new plan allows.
 */
export const changePlan = (planId: PlanId) =>
  handle(() => {
    const user = requireUser();
    const plan = PLANS[planId];
    if (!plan) throw new ApiError("invalid", "Unknown plan.");
    const owned = ownedCount(user.id);
    if (owned > plan.workspaceCreationLimit) {
      throw new ApiError(
        "conflict",
        `You own ${owned} workspaces and ${plan.name} allows ${plan.workspaceCreationLimit}. Transfer ownership of ${owned - plan.workspaceCreationLimit} first.`,
      );
    }
    db.accountPlans[user.id] = plan.id;
    return plan;
  });

// ---------------------------------------------------------------------------
// Workspaces

export const listMyWorkspaces = () =>
  handle<MyWorkspace[]>(() => {
    const user = requireUser();
    return db.memberships
      .filter((m) => m.userId === user.id)
      .map((m) => {
        const workspace = db.workspaces.find((w) => w.id === m.workspaceId)!;
        return {
          workspace,
          role: m.role,
          isOwner: workspace.ownerUserId === user.id,
          memberCount: db.memberships.filter((x) => x.workspaceId === m.workspaceId).length,
          plan: workspacePlan(workspace),
        };
      })
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.workspace.name.localeCompare(b.workspace.name));
  });

/**
 * Creates a workspace owned by the caller. The limit is checked against workspaces the caller
 * *owns*, never memberships. Check and insert happen in one synchronous step; in production this
 * must be one transaction that locks the owner's entitlement row (see docs/production-architecture.md).
 */
export const createWorkspace = (input: { name: string }) =>
  handle<Workspace>(() => {
    const user = requireUser();
    const name = cleanName(input.name, "Workspace name");
    const plan = planFor(user.id);
    if (ownedCount(user.id) >= plan.workspaceCreationLimit) {
      throw new ApiError(
        "limit_reached",
        `The ${plan.name} plan lets you own ${plan.workspaceCreationLimit} workspace${plan.workspaceCreationLimit === 1 ? "" : "s"}. You can still join other workspaces by invitation.`,
      );
    }
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: uid("ws"),
      name,
      color: WORKSPACE_COLORS[db.workspaces.length % WORKSPACE_COLORS.length],
      ownerUserId: user.id,
      createdAt: now,
    };
    db.workspaces.push(workspace);
    db.memberships.push({ id: uid("wm"), workspaceId: workspace.id, userId: user.id, role: "Admin", joinedAt: now });
    db.workspaceSettings[workspace.id] = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      weekStartsOn: 1,
      requireApproval: true,
      defaultNetworks: [],
    };
    db.accounts.push(...seed.placeholderAccounts(workspace.id, name, `${workspace.id}_a`));
    return workspace;
  });

export const renameWorkspace = (workspaceId: string, name: string) =>
  handle(() => {
    const { workspace } = authorize(workspaceId, "workspace.settings.update");
    workspace.name = cleanName(name, "Workspace name");
    return workspace;
  });

export const getWorkspaceSettings = (workspaceId: string) =>
  handle<WorkspaceSettings>(() => authorize(workspaceId, "workspace.view").settings);

export const updateWorkspaceSettings = (workspaceId: string, patch: Partial<WorkspaceSettings>) =>
  handle(() => {
    const { settings } = authorize(workspaceId, "workspace.settings.update");
    if (patch.defaultNetworks?.some((n) => !NETWORK_IDS.includes(n))) throw new ApiError("invalid", "Unknown network.");
    Object.assign(settings, patch);
    return settings;
  });

export const leaveWorkspace = (workspaceId: string) =>
  handle(() => {
    const { user, workspace, role } = authorize(workspaceId, "workspace.view");
    if (workspace.ownerUserId === user.id) throw new ApiError("conflict", "You own this workspace. Transfer ownership to another Admin before leaving.");
    if (role === "Admin" && adminCount(workspaceId) === 1) throw new ApiError("conflict", "You're the only Admin. Make someone else an Admin first.");
    endMembership(workspaceId, user.id);
    return { workspaceId };
  });

/** Owner-only. The new owner must already be an Admin and have room under their own plan. */
export const transferOwnership = (workspaceId: string, toUserId: string) =>
  handle(() => {
    const { user, workspace } = authorize(workspaceId, "workspace.view");
    if (workspace.ownerUserId !== user.id) throw new ApiError("forbidden", "Only the workspace owner can transfer ownership.");
    const target = membershipOf(workspaceId, toUserId);
    if (!target || toUserId === user.id) throw new ApiError("not_found", "Member not found.");
    if (target.role !== "Admin") throw new ApiError("invalid", "Make them an Admin before transferring ownership.");
    const targetUser = db.users.find((u) => u.id === toUserId)!;
    const plan = planFor(toUserId);
    if (ownedCount(toUserId) >= plan.workspaceCreationLimit) {
      throw new ApiError("limit_reached", `${targetUser.name} already owns the most workspaces their ${plan.name} plan allows.`);
    }
    workspace.ownerUserId = toUserId;
    return workspace;
  });

// ---------------------------------------------------------------------------
// Members and invitations (workspace side)

export const listMembers = (workspaceId: string) =>
  handle<Member[]>(() => {
    const { workspace } = authorize(workspaceId, "members.view");
    return db.memberships
      .filter((m) => m.workspaceId === workspaceId)
      .map((m) => ({ ...db.users.find((u) => u.id === m.userId)!, role: m.role, joinedAt: m.joinedAt, isOwner: workspace.ownerUserId === m.userId }))
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name));
  });

export const updateMemberRole = (workspaceId: string, userId: string, role: Role) =>
  handle(() => {
    const { workspace } = authorize(workspaceId, "members.update_role");
    const target = membershipOf(workspaceId, userId);
    if (!target) throw new ApiError("not_found", "Member not found.");
    if (workspace.ownerUserId === userId && role !== "Admin") throw new ApiError("conflict", "The owner is always an Admin. Transfer ownership first.");
    if (target.role === "Admin" && role !== "Admin" && adminCount(workspaceId) === 1) throw new ApiError("conflict", "A workspace needs at least one Admin.");
    target.role = role;
    return target;
  });

export const removeMember = (workspaceId: string, userId: string) =>
  handle(() => {
    const { user, workspace } = authorize(workspaceId, "members.remove");
    const target = membershipOf(workspaceId, userId);
    if (!target) throw new ApiError("not_found", "Member not found.");
    if (userId === user.id) throw new ApiError("invalid", "Use “Leave workspace” to remove yourself.");
    if (workspace.ownerUserId === userId) throw new ApiError("conflict", "The owner can't be removed.");
    if (target.role === "Admin" && adminCount(workspaceId) === 1) throw new ApiError("conflict", "A workspace needs at least one Admin.");
    endMembership(workspaceId, userId);
    return { userId };
  });

export const listInvitations = (workspaceId: string) =>
  handle(() => {
    authorize(workspaceId, "invitations.view");
    return inWs(db.invitations, workspaceId)
      .map(effectiveInvitation)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

function authorizeInvite(workspaceId: string, role: Role) {
  const ctx = authorize(workspaceId, "members.invite");
  if (!assignableRoles(ctx.role).includes(role)) {
    throw new ApiError("forbidden", `${ctx.role}s can't invite or manage ${role} invitations.`);
  }
  return ctx;
}

/**
 * Records an invitation. Email delivery is NOT implemented: the invitee sees it under Workspaces →
 * Invitations when signed in with that address. If no account uses the address yet, the
 * invitation waits for an account with that email (sign-up is not part of the demo).
 */
export const inviteMember = (workspaceId: string, input: { email: string; role: Role }) =>
  handle(() => {
    const { user } = authorizeInvite(workspaceId, input.role);
    const email = normalizeEmail(input.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("invalid", "Enter a valid email address.");
    const existingUser = db.users.find((u) => u.email === email);
    if (existingUser && membershipOf(workspaceId, existingUser.id)) throw new ApiError("conflict", `${existingUser.name} is already a member.`);
    const open = inWs(db.invitations, workspaceId).filter((i) => i.email === email && i.status === "pending");
    if (open.some((i) => effectiveInvitation(i).status === "pending")) {
      throw new ApiError("conflict", `${email} already has a pending invitation. Resend it instead.`);
    }
    // Materialize lapsed ones so at most one row per (workspace, email) is ever "pending" (a DB unique index in production).
    for (const stale of open) stale.status = "expired";

    const now = new Date();
    const invitation: WorkspaceInvitation = {
      id: uid("inv"),
      workspaceId,
      email,
      role: input.role,
      invitedByUserId: user.id,
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 864e5).toISOString(),
      lastSentAt: now.toISOString(),
      sendCount: 1,
      respondedAt: null,
    };
    db.invitations.push(invitation);
    return { invitation, accountExists: !!existingUser, emailSent: false as const };
  });

/** Renews a pending or expired invitation for another week. Still no email is sent. */
export const resendInvitation = (workspaceId: string, invitationId: string) =>
  handle(() => {
    const inv = scoped(db.invitations, workspaceId, invitationId, "Invitation");
    authorizeInvite(workspaceId, inv.role);
    const status = effectiveInvitation(inv).status;
    if (status !== "pending" && status !== "expired") throw new ApiError("invalid", `This invitation was ${status}.`);
    const newer = inWs(db.invitations, workspaceId).some((i) => i !== inv && i.email === inv.email && effectiveInvitation(i).status === "pending");
    if (newer) throw new ApiError("conflict", `${inv.email} already has a newer pending invitation.`);
    const now = new Date();
    Object.assign(inv, {
      status: "pending",
      expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 864e5).toISOString(),
      lastSentAt: now.toISOString(),
      sendCount: inv.sendCount + 1,
    });
    return { invitation: inv, emailSent: false as const };
  });

export const revokeInvitation = (workspaceId: string, invitationId: string) =>
  handle(() => {
    const inv = scoped(db.invitations, workspaceId, invitationId, "Invitation");
    authorizeInvite(workspaceId, inv.role);
    if (effectiveInvitation(inv).status !== "pending") throw new ApiError("invalid", "Only pending invitations can be revoked.");
    inv.status = "revoked";
    inv.respondedAt = new Date().toISOString();
    return inv;
  });

// ---------------------------------------------------------------------------
// Invitations (invitee side)

export const listMyInvitations = () =>
  handle<MyInvitation[]>(() => {
    const user = requireUser();
    return db.invitations
      .filter((i) => i.email === user.email)
      .map(effectiveInvitation)
      .filter((i) => i.status === "pending")
      .map((invitation) => {
        const ws = db.workspaces.find((w) => w.id === invitation.workspaceId)!;
        return {
          invitation,
          workspaceName: ws.name,
          workspaceColor: ws.color,
          invitedByName: db.users.find((u) => u.id === invitation.invitedByUserId)?.name ?? "Someone",
        };
      });
  });

function myInvitation(invitationId: string) {
  const user = requireUser();
  // Matching on the session's email is the authorization: you can only answer invitations addressed to you.
  const inv = db.invitations.find((i) => i.id === invitationId && i.email === user.email);
  if (!inv) throw new ApiError("not_found", "Invitation not found.");
  const status = effectiveInvitation(inv).status;
  if (status !== "pending") throw new ApiError("invalid", `This invitation has ${status === "expired" ? "expired" : `been ${status}`}.`);
  return { user, inv };
}

export const acceptInvitation = (invitationId: string) =>
  handle(() => {
    const { user, inv } = myInvitation(invitationId);
    if (!membershipOf(inv.workspaceId, user.id)) {
      db.memberships.push({ id: uid("wm"), workspaceId: inv.workspaceId, userId: user.id, role: inv.role, joinedAt: new Date().toISOString() });
    }
    inv.status = "accepted";
    inv.respondedAt = new Date().toISOString();
    return { workspaceId: inv.workspaceId, role: inv.role };
  });

export const declineInvitation = (invitationId: string) =>
  handle(() => {
    const { inv } = myInvitation(invitationId);
    inv.status = "declined";
    inv.respondedAt = new Date().toISOString();
    return { invitationId };
  });

// ---------------------------------------------------------------------------
// Posts

export type PostInput = Pick<Post, "content" | "networks" | "mediaIds" | "scheduledAt" | "status"> & { campaign?: string };
export type PostPatch = Partial<PostInput>;

function checkMedia(workspaceId: string, ids: string[]) {
  for (const id of ids) scoped(db.media, workspaceId, id, "Media");
}

function checkTime(scheduledAt: string | null | undefined) {
  if (scheduledAt && new Date(scheduledAt) < new Date()) throw new ApiError("invalid", "That time is in the past.");
}

/** The approval workflow as a state machine. Publishing happens only via the (future) scheduler. */
function assertTransition(
  ctx: { role: Role; userId: string; requireApproval: boolean },
  post: Pick<Post, "authorId" | "status">,
  to: PostStatus,
  scheduledAt: string | null,
) {
  const { role, userId, requireApproval } = ctx;
  const deny = (why: string) => {
    throw new ApiError("forbidden", why);
  };
  switch (to) {
    case "draft":
      if (!canEditPost(role, userId, post) && !can(role, "posts.schedule")) deny("You can't move this post back to drafts.");
      return;
    case "pending":
      if (!scheduledAt) throw new ApiError("invalid", "Pick a date and time before submitting for approval.");
      if (post.status === "scheduled") {
        if (!can(role, "posts.approve")) deny("Only approvers can revoke an approval.");
      } else if (!can(role, "posts.submit") || !canEditPost(role, userId, post)) {
        deny("You can only submit your own posts for approval.");
      }
      return;
    case "scheduled":
      if (!scheduledAt) throw new ApiError("invalid", "Pick a date and time first.");
      if (can(role, "posts.approve")) return;
      if (post.status !== "pending" && !requireApproval && can(role, "posts.submit") && canEditPost(role, userId, post)) return;
      deny("This workspace requires approval from a Manager or Admin.");
      return;
    case "changes_requested":
      if (post.status !== "pending" || !can(role, "posts.approve")) deny("Only approvers can request changes on pending posts.");
      return;
    case "published":
      throw new ApiError("invalid", "Publishing to networks isn't available in demo mode.");
  }
}

export const listPosts = (workspaceId: string) => handle(() => (authorize(workspaceId, "posts.view"), inWs(db.posts, workspaceId)));

export const createPost = (workspaceId: string, input: PostInput) =>
  handle(() => {
    const { user, role, settings } = authorize(workspaceId, "posts.create");
    checkMedia(workspaceId, input.mediaIds);
    checkTime(input.scheduledAt);
    if (input.scheduledAt && !can(role, "posts.schedule")) throw new ApiError("forbidden", "You can't schedule posts.");
    if (input.status !== "draft") {
      assertTransition({ role, userId: user.id, requireApproval: settings.requireApproval }, { authorId: user.id, status: "draft" }, input.status, input.scheduledAt);
    }
    const post: Post = {
      ...input,
      id: uid("p"),
      workspaceId,
      authorId: user.id,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    db.posts.push(post);
    return post;
  });

export const updatePost = (workspaceId: string, id: string, patch: PostPatch) =>
  handle(() => {
    const { user, role, settings } = authorize(workspaceId, "posts.view");
    const post = scoped(db.posts, workspaceId, id, "Post");
    if (post.status === "published") throw new ApiError("invalid", "Published posts can't be changed.");

    const editsContent = (["content", "networks", "mediaIds", "campaign"] as const).some((k) => k in patch);
    if (editsContent && !canEditPost(role, user.id, post)) throw new ApiError("forbidden", "You can only edit your own posts.");
    if (patch.mediaIds) checkMedia(workspaceId, patch.mediaIds);
    if ("scheduledAt" in patch && patch.scheduledAt !== post.scheduledAt) {
      if (!can(role, "posts.schedule")) throw new ApiError("forbidden", "You can't schedule posts.");
      checkTime(patch.scheduledAt);
    }

    const scheduledAt = patch.scheduledAt !== undefined ? patch.scheduledAt : post.scheduledAt;
    let status: PostStatus = post.status;
    if (patch.status && patch.status !== post.status) {
      assertTransition({ role, userId: user.id, requireApproval: settings.requireApproval }, post, patch.status, scheduledAt);
      status = patch.status;
    } else if (editsContent && post.status === "scheduled" && settings.requireApproval && !can(role, "posts.approve")) {
      // Changing approved content without approval rights sends it back for review.
      status = "pending";
    }
    Object.assign(post, patch, { status });
    return post;
  });

export const deletePost = (workspaceId: string, id: string) =>
  handle(() => {
    const { user, role } = authorize(workspaceId, "posts.view");
    const post = scoped(db.posts, workspaceId, id, "Post");
    if (!canDeletePost(role, user.id, post)) throw new ApiError("forbidden", "You can't delete this post.");
    db.posts = db.posts.filter((p) => p !== post);
    return { id };
  });

export const commentOnPost = (workspaceId: string, postId: string, body: string) =>
  handle(() => {
    const { user } = authorize(workspaceId, "comments.create");
    const post = scoped(db.posts, workspaceId, postId, "Post");
    if (!body.trim()) throw new ApiError("invalid", "Comment can't be empty.");
    const comment: Comment = { id: uid("c"), authorId: user.id, body: body.trim(), createdAt: new Date().toISOString() };
    post.comments.push(comment);
    return post;
  });

// ---------------------------------------------------------------------------
// Media

export const listMedia = (workspaceId: string) => handle(() => (authorize(workspaceId, "media.view"), inWs(db.media, workspaceId)));

export const uploadMedia = (workspaceId: string, item: Omit<MediaItem, "id" | "createdAt" | "workspaceId">) =>
  handle(() => {
    authorize(workspaceId, "media.upload");
    const created: MediaItem = { ...item, id: uid("m"), workspaceId, createdAt: new Date().toISOString() };
    db.media.unshift(created);
    return created;
  });

export const updateMediaTags = (workspaceId: string, id: string, tags: string[]) =>
  handle(() => {
    authorize(workspaceId, "media.upload");
    const item = scoped(db.media, workspaceId, id, "Media");
    item.tags = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    return item;
  });

export const deleteMedia = (workspaceId: string, id: string) =>
  handle(() => {
    authorize(workspaceId, "media.delete");
    const item = scoped(db.media, workspaceId, id, "Media");
    db.media = db.media.filter((m) => m !== item);
    for (const p of inWs(db.posts, workspaceId)) p.mediaIds = p.mediaIds.filter((m) => m !== id);
    return { id };
  });

// ---------------------------------------------------------------------------
// Inbox and mentions

export const listInbox = (workspaceId: string) => handle(() => (authorize(workspaceId, "inbox.view"), inWs(db.inbox, workspaceId)));

export const updateInboxItem = (workspaceId: string, id: string, patch: Partial<Pick<InboxItem, "read" | "status" | "assigneeId">>) =>
  handle(() => {
    authorize(workspaceId, patch.assigneeId !== undefined ? "inbox.assign" : patch.status ? "inbox.reply" : "inbox.view");
    const item = scoped(db.inbox, workspaceId, id, "Conversation");
    if (patch.assigneeId) {
      const assignee = membershipOf(workspaceId, patch.assigneeId);
      if (!assignee || !can(assignee.role, "inbox.reply")) throw new ApiError("invalid", "Conversations can only be assigned to members who can reply.");
    }
    Object.assign(item, patch);
    return item;
  });

export const replyToInboxItem = (workspaceId: string, id: string, body: string) =>
  handle(() => {
    const { user } = authorize(workspaceId, "inbox.reply");
    const item = scoped(db.inbox, workspaceId, id, "Conversation");
    if (!body.trim()) throw new ApiError("invalid", "Reply can't be empty.");
    // Demo: the reply is stored here only; nothing is posted to the network.
    item.replies.push({ id: uid("r"), authorId: user.id, body: body.trim(), createdAt: new Date().toISOString() });
    item.read = true;
    return item;
  });

export const listMentions = (workspaceId: string) => handle<Mention[]>(() => (authorize(workspaceId, "inbox.view"), inWs(db.mentions, workspaceId)));

// ---------------------------------------------------------------------------
// Social accounts

export const listAccounts = (workspaceId: string) => handle<Account[]>(() => (authorize(workspaceId, "accounts.view"), inWs(db.accounts, workspaceId)));

/** Simulated: flips a flag. A real connection runs the network's OAuth flow and stores tokens server-side. */
export const setAccountConnected = (workspaceId: string, id: string, connected: boolean) =>
  handle(() => {
    authorize(workspaceId, "accounts.manage");
    const account = scoped(db.accounts, workspaceId, id, "Account");
    account.connected = connected;
    account.lastSync = connected ? new Date().toISOString() : null;
    return account;
  });

// ---------------------------------------------------------------------------
// Analytics

export const getAnalytics = (workspaceId: string) =>
  handle<{ daily: DailyMetric[]; posts: PostMetrics[] }>(() => {
    const { workspace } = authorize(workspaceId, "analytics.view");
    const cutoff = analyticsCutoff(workspace);
    return { daily: inWs(db.dailyMetrics, workspaceId).filter((r) => r.date >= cutoff), posts: inWs(db.postMetrics, workspaceId) };
  });

export const exportAnalyticsCsv = (workspaceId: string, opts: { since: string; network: NetworkId | "all" }) =>
  handle(() => {
    const { user, workspace } = authorize(workspaceId, "analytics.export");
    const plan = workspacePlan(workspace);
    if (!plan.csvExport) {
      const owner = workspace.ownerUserId === user.id ? "you" : db.users.find((u) => u.id === workspace.ownerUserId)?.name ?? "its owner";
      throw new ApiError("upgrade_required", `CSV export comes with Pro and Agency. ${workspace.name} uses its owner's ${plan.name} plan, which only ${owner} can change.`);
    }
    const since = opts.since > analyticsCutoff(workspace) ? opts.since : analyticsCutoff(workspace);
    const rows = inWs(db.dailyMetrics, workspaceId).filter((r) => r.date >= since && (opts.network === "all" || r.network === opts.network));
    const header = "date,network,followers,impressions,engagements,clicks";
    return [header, ...rows.map((r) => [r.date, r.network, r.followers, r.impressions, r.engagements, r.clicks].join(","))].join("\n");
  });
