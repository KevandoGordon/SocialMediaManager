/**
 * Local persistence. All app data lives in one JSON file (default .data/store.json, git-ignored),
 * loaded once per server process and rewritten after every change. This is the "local only"
 * stage of docs/production-architecture.md: the API rules are the real ones, the storage is not
 * meant for more than one server process.
 */
import fs from "node:fs";
import path from "node:path";
import type {
  Account,
  DailyMetric,
  InboxItem,
  MediaItem,
  Mention,
  NetworkId,
  NotificationPrefs,
  PlanId,
  Post,
  PostMetrics,
  User,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMembership,
  WorkspaceSettings,
} from "../types";

export interface PasswordRecord {
  salt: string;
  hash: string;
}

export interface SessionRecord {
  userId: string;
  expiresAt: string;
}

/** An OAuth sign-in in progress, keyed by its `state` parameter. */
export interface OAuthAttempt {
  userId: string;
  workspaceId: string;
  network: NetworkId;
  /** PKCE verifier, for networks that use one. */
  verifier: string | null;
  expiresAt: string;
}

/** A profile or page the network returned, with its token encrypted. */
export interface ConnectableProfile {
  externalId: string;
  name: string;
  handle: string;
  followers: number | null;
  avatarUrl: string | null;
  encryptedToken: string;
}

/** Several pages came back (e.g. Facebook) and the user still has to pick one. */
export interface PendingConnection {
  userId: string;
  workspaceId: string;
  network: NetworkId;
  options: ConnectableProfile[];
  expiresAt: string;
}

export interface State {
  users: User[];
  workspaces: Workspace[];
  memberships: WorkspaceMembership[];
  invitations: WorkspaceInvitation[];
  accountPlans: Record<string, PlanId>;
  workspaceSettings: Record<string, WorkspaceSettings>;
  notificationPrefs: Record<string, NotificationPrefs>;
  posts: Post[];
  media: MediaItem[];
  inbox: InboxItem[];
  mentions: Mention[];
  accounts: Account[];
  dailyMetrics: DailyMetric[];
  postMetrics: PostMetrics[];
  /** By user id. */
  passwords: Record<string, PasswordRecord>;
  /** By SHA-256 of the session token; the token itself is only in the user's cookie. */
  sessions: Record<string, SessionRecord>;
  oauthAttempts: Record<string, OAuthAttempt>;
  pendingConnections: Record<string, PendingConnection>;
  /** Encrypted token set per connected account id. Never returned to the browser. */
  accountTokens: Record<string, string>;
}

export const emptyState = (): State => ({
  users: [],
  workspaces: [],
  memberships: [],
  invitations: [],
  accountPlans: {},
  workspaceSettings: {},
  notificationPrefs: {},
  posts: [],
  media: [],
  inbox: [],
  mentions: [],
  accounts: [],
  dailyMetrics: [],
  postMetrics: [],
  passwords: {},
  sessions: {},
  oauthAttempts: {},
  pendingConnections: {},
  accountTokens: {},
});

/** ":memory:" keeps everything in memory (used by the tests). */
const FILE = process.env.DATA_FILE ?? path.join(process.cwd(), ".data", "store.json");
export const DATA_DIR = FILE === ":memory:" ? null : path.dirname(FILE);

// Kept on globalThis so dev-server hot reloads and separate module copies share one state.
const g = globalThis as unknown as { __scState?: State; __scSaved?: string };

export function state(): State {
  if (!g.__scState) {
    let loaded = emptyState();
    if (FILE !== ":memory:" && fs.existsSync(FILE)) {
      g.__scSaved = fs.readFileSync(FILE, "utf8");
      loaded = { ...loaded, ...JSON.parse(g.__scSaved) };
    }
    g.__scState = loaded;
  }
  return g.__scState;
}

/** Writes the state if it changed. Write-then-rename so a crash never leaves a half-written file. */
export function persist() {
  if (FILE === ":memory:") return;
  const json = JSON.stringify(state());
  if (json === g.__scSaved) return;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, json, { mode: 0o600 });
  fs.renameSync(tmp, FILE);
  g.__scSaved = json;
}

/** Replaces everything in place, so modules holding a reference to state() see the new data. */
export function replaceState(next: State) {
  Object.assign(state(), emptyState(), structuredClone(next));
  persist();
}
