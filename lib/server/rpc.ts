/**
 * The browser's only way into the API (via POST /api/rpc). Each call names a function from the
 * allowlist below and runs it as the user from the session cookie.
 */
import * as api from "../data/api";
import { ApiError, type ApiErrorCode } from "../data/errors";

const METHODS = [
  "getSession", "updateProfile", "updateNotificationPrefs", "changePlan",
  "listMyWorkspaces", "createWorkspace", "renameWorkspace", "getWorkspaceSettings", "updateWorkspaceSettings", "leaveWorkspace", "transferOwnership",
  "listMembers", "updateMemberRole", "removeMember",
  "listInvitations", "inviteMember", "resendInvitation", "revokeInvitation", "listMyInvitations", "acceptInvitation", "declineInvitation",
  "listPosts", "createPost", "updatePost", "deletePost", "commentOnPost",
  "listMedia", "updateMediaTags", "deleteMedia",
  "listInbox", "updateInboxItem", "replyToInboxItem", "listMentions",
  "listAccounts", "connectionSetup", "getPendingConnection", "completePendingConnection", "disconnectAccount",
  "getAnalytics", "exportAnalyticsCsv",
] as const;

export type RpcMethod = (typeof METHODS)[number];
export type RpcResult = { ok: true; data: unknown } | { ok: false; code: ApiErrorCode; message: string };

export async function dispatch(userId: string | null, method: unknown, args: unknown): Promise<RpcResult> {
  if (typeof method !== "string" || !(METHODS as readonly string[]).includes(method) || !Array.isArray(args)) {
    return { ok: false, code: "invalid", message: "Unknown request." };
  }
  try {
    const fn = api[method as RpcMethod] as (...a: unknown[]) => Promise<unknown>;
    return { ok: true, data: await api.runAs(userId, () => fn(...args)) };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, code: e.code, message: e.message };
    console.error(`rpc ${method} failed`, e);
    return { ok: false, code: "internal", message: "Something went wrong on the server. Try again." };
  }
}
