import {
  AtSign,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Layers,
  Link2,
  PenSquare,
  Settings,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar; everything else goes in the drawer. */
  primary?: boolean;
  badge?: "approvals" | "inbox" | "invitations";
  /** Account-level pages work without an active workspace. */
  account?: boolean;
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Plan",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, primary: true },
      { href: "/compose", label: "Compose", icon: PenSquare, primary: true },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, primary: true },
      { href: "/approvals", label: "Approvals", icon: CheckCircle2, badge: "approvals" },
    ],
  },
  {
    title: "Engage",
    items: [
      { href: "/inbox", label: "Inbox", icon: Inbox, primary: true, badge: "inbox" },
      { href: "/mentions", label: "Mentions", icon: AtSign },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/media", label: "Media library", icon: ImageIcon },
      { href: "/accounts", label: "Accounts", icon: Link2 },
      { href: "/team", label: "Team", icon: Users },
      { href: "/settings", label: "Workspace settings", icon: Settings },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/workspaces", label: "Workspaces", icon: Layers, badge: "invitations", account: true },
      { href: "/profile", label: "Profile", icon: UserCircle, account: true },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
