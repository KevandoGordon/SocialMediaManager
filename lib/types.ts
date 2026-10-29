export type NetworkId =
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads";

export type Role = "Admin" | "Manager" | "Editor" | "Viewer";

/** A global account. Roles live on workspace memberships, never on the user. */
export interface User {
  id: string;
  name: string;
  /** Lowercased; invitations are matched against it. */
  email: string;
  title: string;
  color: string;
  lastActive: string;
}

export type PlanId = "free" | "pro" | "agency";

/** Entitlements of a billing plan. A plan belongs to an account; its workspace features apply to the workspaces that account owns. */
export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  /** How many workspaces an account may own at once. Joining via invitation never counts. */
  workspaceCreationLimit: number;
  /** How many days of analytics are visible in owned workspaces, today included. */
  analyticsHistoryDays: number;
  csvExport: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  /** The single owning account; its plan entitlement is what the creation limit is checked against. */
  ownerUserId: string;
  createdAt: string;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "revoked" | "expired";

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: Role;
  invitedByUserId: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  lastSentAt: string;
  sendCount: number;
  respondedAt: string | null;
}

/** A workspace member as the Team page sees them: the global user plus their role here. */
export interface Member extends User {
  role: Role;
  joinedAt: string;
  isOwner: boolean;
}

/** One entry in the signed-in user's workspace switcher. */
export interface MyWorkspace {
  workspace: Workspace;
  role: Role;
  isOwner: boolean;
  memberCount: number;
  /** The owner's plan, which decides this workspace's features. */
  plan: Plan;
}

export interface MyInvitation {
  invitation: WorkspaceInvitation;
  workspaceName: string;
  workspaceColor: string;
  invitedByName: string;
}

export interface Session {
  user: User;
  plan: Plan;
  ownedWorkspaceCount: number;
  notifications: NotificationPrefs;
}

export type PostStatus =
  | "draft"
  | "pending"
  | "changes_requested"
  | "scheduled"
  | "published";

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Post {
  id: string;
  workspaceId: string;
  content: string;
  networks: NetworkId[];
  mediaIds: string[];
  scheduledAt: string | null;
  status: PostStatus;
  authorId: string;
  createdAt: string;
  campaign?: string;
  comments: Comment[];
}

export interface MediaItem {
  id: string;
  workspaceId: string;
  name: string;
  type: "image" | "video";
  width: number;
  height: number;
  sizeKb: number;
  durationSec?: number;
  tags: string[];
  /** Two hues used to draw a placeholder when there is no real file. */
  hues: [number, number];
  /** Where the uploaded file is served from; absent for items without a real file. */
  src?: string;
  mimeType?: string;
  createdAt: string;
}

export interface InboxReply {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface InboxItem {
  id: string;
  workspaceId: string;
  network: NetworkId;
  kind: "comment" | "dm";
  from: { name: string; handle: string };
  body: string;
  receivedAt: string;
  postId?: string;
  assigneeId: string | null;
  status: "open" | "done";
  read: boolean;
  replies: InboxReply[];
}

export type Sentiment = "positive" | "neutral" | "negative";

export interface Mention {
  id: string;
  workspaceId: string;
  network: NetworkId;
  author: string;
  handle: string;
  body: string;
  sentiment: Sentiment;
  reach: number;
  createdAt: string;
}

/** A connected social profile. Credentials would live server-side only, never in this type. */
export interface Account {
  id: string;
  workspaceId: string;
  network: NetworkId;
  name: string;
  handle: string;
  connected: boolean;
  /** Null when the network doesn't share a follower count with this app. */
  followers: number | null;
  lastSync: string | null;
  /** The network's own id for the connected profile or page. */
  externalId?: string | null;
  avatarUrl?: string | null;
}

export interface DailyMetric {
  workspaceId: string;
  date: string;
  network: NetworkId;
  followers: number;
  impressions: number;
  engagements: number;
  clicks: number;
}

export interface PostMetrics {
  workspaceId: string;
  postId: string;
  network: NetworkId;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
}

export interface NotificationPrefs {
  approvalRequests: boolean;
  approvalDecisions: boolean;
  newMessages: boolean;
  negativeMentions: boolean;
  weeklyReport: boolean;
  channel: "email" | "push" | "both";
}

/** Per-workspace preferences. The workspace name lives on Workspace, not here. */
export interface WorkspaceSettings {
  timezone: string;
  weekStartsOn: 0 | 1;
  requireApproval: boolean;
  defaultNetworks: NetworkId[];
}
