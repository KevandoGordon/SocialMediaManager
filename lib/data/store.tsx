"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import * as api from "./api";
import { ApiError } from "./errors";
import type {
  Account,
  DailyMetric,
  InboxItem,
  Member,
  MediaItem,
  Mention,
  MyInvitation,
  MyWorkspace,
  NotificationPrefs,
  Post,
  PostMetrics,
  Role,
  Session,
  User,
  WorkspaceInvitation,
  WorkspaceSettings,
} from "../types";
import { can, minRole, type Permission } from "../permissions";

/** Everything loaded for the active workspace. Tagged with its id so stale data is never shown. */
interface WorkspaceData {
  workspaceId: string;
  members: Member[];
  invitations: WorkspaceInvitation[];
  posts: Post[];
  media: MediaItem[];
  inbox: InboxItem[];
  mentions: Mention[];
  accounts: Account[];
  daily: DailyMetric[];
  postMetrics: PostMetrics[];
  settings: WorkspaceSettings;
}

type Collection = Exclude<keyof WorkspaceData, "workspaceId" | "settings">;

const DEMO_USER_KEY = "sc.demoUser";
const activeKey = (userId: string) => `sc.activeWorkspace.${userId}`;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function replace<T extends { id: string }>(list: T[], item: T) {
  return list.map((x) => (x.id === item.id ? item : x));
}

async function loadWorkspace(workspaceId: string, role: Role): Promise<WorkspaceData> {
  const [members, invitations, posts, media, inbox, mentions, accounts, analytics, settings] = await Promise.all([
    api.listMembers(workspaceId),
    can(role, "invitations.view") ? api.listInvitations(workspaceId) : Promise.resolve([]),
    api.listPosts(workspaceId),
    api.listMedia(workspaceId),
    api.listInbox(workspaceId),
    api.listMentions(workspaceId),
    api.listAccounts(workspaceId),
    api.getAnalytics(workspaceId),
    api.getWorkspaceSettings(workspaceId),
  ]);
  return { workspaceId, members, invitations, posts, media, inbox, mentions, accounts, daily: analytics.daily, postMetrics: analytics.posts, settings };
}

function useStoreValue() {
  const toast = useToast();
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [workspaces, setWorkspaces] = useState<MyWorkspace[]>([]);
  const [myInvitations, setMyInvitations] = useState<MyInvitation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [previewRoles, setPreviewRoles] = useState<Record<string, Role | undefined>>({});
  const [sessionLoading, setSessionLoading] = useState(true);
  const loadToken = useRef(0);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const active = workspaces.find((w) => w.workspace.id === activeId) ?? null;

  /** Reloads account-level state and picks a valid active workspace (preferred → current → remembered → owned → first). */
  const refreshSession = useCallback(async (prefer?: string) => {
    const [s, ws, inv] = await Promise.all([api.getSession(), api.listMyWorkspaces(), api.listMyInvitations()]);
    setSession(s);
    setWorkspaces(ws);
    setMyInvitations(inv);
    const ids = new Set(ws.map((w) => w.workspace.id));
    const remembered = read(activeKey(s.user.id));
    const next =
      [prefer, activeRef.current, remembered].find((id): id is string => !!id && ids.has(id)) ??
      ws.find((w) => w.isOwner)?.workspace.id ??
      ws[0]?.workspace.id ??
      null;
    setActiveId(next);
    setSessionLoading(false);
    return s;
  }, []);

  const signInAs = useCallback(
    async (userId: string) => {
      setSessionLoading(true);
      setData(null);
      setActiveId(null);
      activeRef.current = null;
      setPreviewRoles({});
      api.demoSignIn(userId);
      write(DEMO_USER_KEY, userId);
      await refreshSession();
    },
    [refreshSession],
  );

  useEffect(() => {
    api.listDemoIdentities().then(setDemoUsers);
    const stored = read(DEMO_USER_KEY);
    signInAs(stored && stored !== "" ? stored : "u1").catch(() => signInAs("u1"));
  }, [signInAs]);

  // Load the active workspace. Data from the previous workspace is cleared immediately, and a
  // response that arrives after another switch is discarded.
  const actualRole = active?.role ?? null;
  const reloadWorkspace = useCallback(async () => {
    const id = activeRef.current;
    const role = workspaces.find((w) => w.workspace.id === id)?.role;
    if (!id || !role) return;
    const token = ++loadToken.current;
    try {
      const loaded = await loadWorkspace(id, role);
      if (token === loadToken.current && activeRef.current === id) setData(loaded);
    } catch (e) {
      if (e instanceof ApiError && token === loadToken.current) {
        toast(e.message, "error");
        refreshSession();
      }
    }
  }, [workspaces, toast, refreshSession]);

  useEffect(() => {
    setData((d) => (d?.workspaceId === activeId ? d : null));
    if (!activeId || !actualRole || !session) return;
    write(activeKey(session.user.id), activeId);
    reloadWorkspace();
    // Role changes (e.g. after accepting an invite) also reload, since what's visible depends on it.
  }, [activeId, actualRole, session, reloadWorkspace]);

  const switchWorkspace = useCallback((id: string) => {
    if (id === activeRef.current) return;
    loadToken.current++;
    setData(null);
    setActiveId(id);
  }, []);

  /** Runs an API call; on failure shows the server's message and resyncs the workspace. */
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        toast(e.message, "error");
        if (e.code === "not_found" || e.code === "forbidden") refreshSession();
        reloadWorkspace();
        return undefined;
      }
    },
    [toast, refreshSession, reloadWorkspace],
  );

  /** Applies a change to the loaded workspace only if it's still the one the change was made in. */
  const patch = useCallback(<K extends Collection>(workspaceId: string, key: K, fn: (v: WorkspaceData[K]) => WorkspaceData[K]) => {
    setData((d) => (d && d.workspaceId === workspaceId ? { ...d, [key]: fn(d[key]) } : d));
  }, []);

  const actions = useMemo(() => {
    const ws = () => {
      const id = activeRef.current;
      if (!id) throw new ApiError("not_found", "No workspace selected.");
      return id;
    };
    return {
      // Account
      updateProfile: (p: { name?: string; title?: string }) =>
        run(async () => {
          const user = await api.updateProfile(p);
          setSession((s) => (s ? { ...s, user } : s));
          setData((d) => (d ? { ...d, members: d.members.map((m) => (m.id === user.id ? { ...m, ...user } : m)) } : d));
          return user;
        }),
      updateNotificationPrefs: (prefs: NotificationPrefs) =>
        run(async () => {
          const notifications = await api.updateNotificationPrefs(prefs);
          setSession((s) => (s ? { ...s, notifications } : s));
          return notifications;
        }),

      // Workspaces
      createWorkspace: (name: string) =>
        run(async () => {
          const created = await api.createWorkspace({ name });
          await refreshSession(created.id);
          return created;
        }),
      renameWorkspace: (name: string) =>
        run(async () => {
          const updated = await api.renameWorkspace(ws(), name);
          setWorkspaces((list) => list.map((w) => (w.workspace.id === updated.id ? { ...w, workspace: updated } : w)));
          return updated;
        }),
      updateWorkspaceSettings: (p: Partial<WorkspaceSettings>) =>
        run(async () => {
          const id = ws();
          const settings = await api.updateWorkspaceSettings(id, p);
          setData((d) => (d && d.workspaceId === id ? { ...d, settings } : d));
          return settings;
        }),
      leaveWorkspace: (workspaceId: string) =>
        run(async () => {
          await api.leaveWorkspace(workspaceId);
          if (workspaceId === activeRef.current) activeRef.current = null;
          await refreshSession();
          return true;
        }),
      transferOwnership: (userId: string) =>
        run(async () => {
          await api.transferOwnership(ws(), userId);
          await refreshSession();
          await reloadWorkspace();
          return true;
        }),

      // Invitations: invitee side
      acceptInvitation: (invitationId: string) =>
        run(async () => {
          const result = await api.acceptInvitation(invitationId);
          await refreshSession(result.workspaceId);
          return result;
        }),
      declineInvitation: (invitationId: string) =>
        run(async () => {
          await api.declineInvitation(invitationId);
          setMyInvitations((l) => l.filter((i) => i.invitation.id !== invitationId));
          return true;
        }),

      // Members and invitations: workspace side
      inviteMember: (email: string, role: Role) =>
        run(async () => {
          const id = ws();
          const result = await api.inviteMember(id, { email, role });
          patch(id, "invitations", (l) => [result.invitation, ...l]);
          return result;
        }),
      resendInvitation: (invitationId: string) =>
        run(async () => {
          const id = ws();
          const { invitation } = await api.resendInvitation(id, invitationId);
          patch(id, "invitations", (l) => replace(l, invitation));
          return invitation;
        }),
      revokeInvitation: (invitationId: string) =>
        run(async () => {
          const id = ws();
          const invitation = await api.revokeInvitation(id, invitationId);
          patch(id, "invitations", (l) => replace(l, invitation));
          return invitation;
        }),
      updateMemberRole: (userId: string, role: Role) =>
        run(async () => {
          const id = ws();
          await api.updateMemberRole(id, userId, role);
          patch(id, "members", (l) => l.map((m) => (m.id === userId ? { ...m, role } : m)));
          if (userId === session?.user.id) await refreshSession();
          return true;
        }),
      removeMember: (userId: string) =>
        run(async () => {
          const id = ws();
          await api.removeMember(id, userId);
          patch(id, "members", (l) => l.filter((m) => m.id !== userId));
          patch(id, "inbox", (l) => l.map((i) => (i.assigneeId === userId ? { ...i, assigneeId: null } : i)));
          return true;
        }),

      // Posts
      createPost: (input: api.PostInput) =>
        run(async () => {
          const id = ws();
          const post = await api.createPost(id, input);
          patch(id, "posts", (l) => [...l, post]);
          return post;
        }),
      /** Optimistic so drag-and-drop feels instant; reverted by a reload if the server refuses. */
      updatePost: (postId: string, changes: api.PostPatch) =>
        run(async () => {
          const id = ws();
          patch(id, "posts", (l) => l.map((p) => (p.id === postId ? { ...p, ...changes } : p)));
          const post = await api.updatePost(id, postId, changes);
          patch(id, "posts", (l) => replace(l, post));
          return post;
        }),
      deletePost: (postId: string) =>
        run(async () => {
          const id = ws();
          await api.deletePost(id, postId);
          patch(id, "posts", (l) => l.filter((p) => p.id !== postId));
          return true;
        }),
      commentOnPost: (postId: string, body: string) =>
        run(async () => {
          const id = ws();
          const post = await api.commentOnPost(id, postId, body);
          patch(id, "posts", (l) => replace(l, post));
          return post;
        }),

      // Media
      uploadMedia: (item: Parameters<typeof api.uploadMedia>[1]) =>
        run(async () => {
          const id = ws();
          const created = await api.uploadMedia(id, item);
          patch(id, "media", (l) => [created, ...l]);
          return created;
        }),
      updateMediaTags: (mediaId: string, tags: string[]) =>
        run(async () => {
          const id = ws();
          const item = await api.updateMediaTags(id, mediaId, tags);
          patch(id, "media", (l) => replace(l, item));
          return item;
        }),
      deleteMedia: (mediaId: string) =>
        run(async () => {
          const id = ws();
          await api.deleteMedia(id, mediaId);
          patch(id, "media", (l) => l.filter((m) => m.id !== mediaId));
          patch(id, "posts", (l) => l.map((p) => ({ ...p, mediaIds: p.mediaIds.filter((m) => m !== mediaId) })));
          return true;
        }),

      // Inbox
      updateInboxItem: (itemId: string, changes: Parameters<typeof api.updateInboxItem>[2]) =>
        run(async () => {
          const id = ws();
          patch(id, "inbox", (l) => l.map((i) => (i.id === itemId ? { ...i, ...changes } : i)));
          const item = await api.updateInboxItem(id, itemId, changes);
          patch(id, "inbox", (l) => replace(l, item));
          return item;
        }),
      replyToInboxItem: (itemId: string, body: string) =>
        run(async () => {
          const id = ws();
          const item = await api.replyToInboxItem(id, itemId, body);
          patch(id, "inbox", (l) => replace(l, item));
          return item;
        }),

      // Accounts and analytics
      setAccountConnected: (accountId: string, connected: boolean) =>
        run(async () => {
          const id = ws();
          const account = await api.setAccountConnected(id, accountId, connected);
          patch(id, "accounts", (l) => replace(l, account));
          return account;
        }),
      exportAnalyticsCsv: (opts: Parameters<typeof api.exportAnalyticsCsv>[1]) => run(() => api.exportAnalyticsCsv(ws(), opts)),
    };
  }, [run, patch, refreshSession, reloadWorkspace, session?.user.id]);

  const previewRole = activeId ? previewRoles[activeId] : undefined;
  const role = actualRole ? minRole(actualRole, previewRole) : null;
  const setPreviewRole = useCallback((r: Role | undefined) => {
    const id = activeRef.current;
    if (id) setPreviewRoles((p) => ({ ...p, [id]: r }));
  }, []);

  const ready = data && data.workspaceId === activeId ? data : null;

  return {
    // Account
    demoUsers,
    session,
    currentUser: session?.user,
    sessionLoading,
    signInAs,
    myInvitations,
    // Workspaces
    workspaces,
    activeWorkspace: active,
    switchWorkspace,
    /** Effective role in the active workspace (after any preview lens). */
    role,
    actualRole,
    previewRole,
    setPreviewRole,
    // Active workspace data
    workspaceLoading: !!activeId && !ready,
    members: ready?.members ?? [],
    invitations: ready?.invitations ?? [],
    posts: ready?.posts ?? [],
    media: ready?.media ?? [],
    inbox: ready?.inbox ?? [],
    mentions: ready?.mentions ?? [],
    accounts: ready?.accounts ?? [],
    daily: ready?.daily ?? [],
    postMetrics: ready?.postMetrics ?? [],
    workspaceSettings: ready?.settings ?? null,
    actions,
  };
}

type Store = ReturnType<typeof useStoreValue>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Permission check for the active workspace. UI only; the API re-checks against the real role. */
export function useCan() {
  const { role } = useStore();
  return useCallback((permission: Permission) => can(role, permission), [role]);
}

export function useMember(id: string | null | undefined) {
  const { members } = useStore();
  return members.find((m) => m.id === id);
}
