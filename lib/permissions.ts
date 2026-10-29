/**
 * The single source of truth for authorization. Both the mock API (enforcement) and the UI
 * (hiding/disabling controls) call into this module; nothing else compares role names.
 */
import type { Post, Role } from "./types";

export const ROLES: Role[] = ["Admin", "Manager", "Editor", "Viewer"];

const RANK: Record<Role, number> = { Viewer: 0, Editor: 1, Manager: 2, Admin: 3 };

const ALL: Role[] = ["Admin", "Manager", "Editor", "Viewer"];
const CONTENT: Role[] = ["Admin", "Manager", "Editor"];
const LEADS: Role[] = ["Admin", "Manager"];
const ADMIN: Role[] = ["Admin"];

export const PERMISSION_GROUPS = ["Workspace", "Members", "Social accounts", "Posts", "Approvals", "Inbox", "Media", "Analytics"] as const;

export const PERMISSIONS = {
  "workspace.view": { group: "Workspace", label: "View workspace and its settings", roles: ALL },
  "workspace.settings.update": { group: "Workspace", label: "Rename workspace and change settings", roles: ADMIN },

  "members.view": { group: "Members", label: "See the member list", roles: ALL },
  "invitations.view": { group: "Members", label: "See pending invitations", roles: LEADS },
  "members.invite": { group: "Members", label: "Invite, resend and revoke invitations (Managers: Editor/Viewer only)", roles: LEADS },
  "members.update_role": { group: "Members", label: "Change members' roles", roles: ADMIN },
  "members.remove": { group: "Members", label: "Remove members", roles: ADMIN },

  "accounts.view": { group: "Social accounts", label: "See connected accounts", roles: ALL },
  "accounts.manage": { group: "Social accounts", label: "Connect and disconnect accounts", roles: LEADS },

  "posts.view": { group: "Posts", label: "See posts and the calendar", roles: ALL },
  "posts.create": { group: "Posts", label: "Create posts", roles: CONTENT },
  "posts.edit_own": { group: "Posts", label: "Edit own unpublished posts", roles: CONTENT },
  "posts.edit_any": { group: "Posts", label: "Edit anyone's unpublished posts", roles: LEADS },
  "posts.schedule": { group: "Posts", label: "Schedule and reschedule posts", roles: CONTENT },
  "posts.delete_own": { group: "Posts", label: "Delete own drafts", roles: CONTENT },
  "posts.delete_any": { group: "Posts", label: "Delete any unpublished post", roles: LEADS },

  "posts.submit": { group: "Approvals", label: "Submit posts for approval", roles: CONTENT },
  "posts.approve": { group: "Approvals", label: "Approve, request changes or revoke approval", roles: LEADS },
  "comments.create": { group: "Approvals", label: "Comment on posts", roles: ALL },

  "inbox.view": { group: "Inbox", label: "Read conversations and mentions", roles: ALL },
  "inbox.reply": { group: "Inbox", label: "Reply and close conversations", roles: CONTENT },
  "inbox.assign": { group: "Inbox", label: "Assign conversations", roles: LEADS },

  "media.view": { group: "Media", label: "Browse the media library", roles: ALL },
  "media.upload": { group: "Media", label: "Upload media and edit tags", roles: CONTENT },
  "media.delete": { group: "Media", label: "Delete media", roles: LEADS },

  "analytics.view": { group: "Analytics", label: "View analytics", roles: ALL },
  "analytics.export": { group: "Analytics", label: "Export reports", roles: LEADS },
} satisfies Record<string, { group: (typeof PERMISSION_GROUPS)[number]; label: string; roles: Role[] }>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission) {
  return !!role && (PERMISSIONS[permission].roles as Role[]).includes(role);
}

/** The lower of two roles; used by the demo "preview as" lens, which can only ever reduce access. */
export function minRole(a: Role, b: Role | undefined) {
  return b && RANK[b] < RANK[a] ? b : a;
}

export function rolesAtOrBelow(role: Role) {
  return ROLES.filter((r) => RANK[r] <= RANK[role]);
}

/** Roles an actor may hand out through invitations. Prevents escalation above what they could grant. */
export function assignableRoles(actor: Role | null | undefined): Role[] {
  if (can(actor, "members.update_role")) return ROLES;
  if (can(actor, "members.invite")) return ["Editor", "Viewer"];
  return [];
}

// Resource-level policies: role permission plus facts about the specific record.

export function canEditPost(role: Role | null | undefined, userId: string, post: Pick<Post, "authorId" | "status">) {
  if (post.status === "published") return false;
  return can(role, "posts.edit_any") || (can(role, "posts.edit_own") && post.authorId === userId);
}

export function canDeletePost(role: Role | null | undefined, userId: string, post: Pick<Post, "authorId" | "status">) {
  if (post.status === "published") return false;
  if (can(role, "posts.delete_any")) return true;
  return can(role, "posts.delete_own") && post.authorId === userId && (post.status === "draft" || post.status === "changes_requested");
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Admin: "Full workspace administration: settings, members, roles and everything below.",
  Manager: "Runs day-to-day operations: approvals, accounts, inbox assignment, exports. Can invite Editors and Viewers.",
  Editor: "Writes and schedules content, edits their own posts and submits them for approval.",
  Viewer: "Read-only access to content and analytics; can leave comments on posts.",
};

export const OWNER_NOTE =
  "The owner is always an Admin. Only the owner can transfer ownership, and they must do so before leaving.";
