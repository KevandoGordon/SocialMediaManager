import type { User } from "../../lib/types";
import { minutesAgo } from "./helpers";

/**
 * Global accounts. These double as the demo identities offered by the header's demo sign-in menu;
 * there is no real authentication. Roles come from workspace memberships (see workspaces.ts).
 */
export const users: User[] = [
  { id: "u1", name: "Jordan Lee", email: "jordan@kestrelstudio.example", title: "Head of Social", color: "#5b4bf5", lastActive: minutesAgo(1) },
  { id: "u2", name: "Priya Shah", email: "priya@kestrelstudio.example", title: "Content Manager", color: "#0ea5e9", lastActive: minutesAgo(12) },
  { id: "u3", name: "Marcus Webb", email: "marcus@kestrelstudio.example", title: "Copywriter", color: "#f97316", lastActive: minutesAgo(45) },
  { id: "u4", name: "Sofia Alvarez", email: "sofia@kestrelstudio.example", title: "Community Manager", color: "#10b981", lastActive: minutesAgo(180) },
  { id: "u5", name: "Ethan Brooks", email: "ethan@client-brand.com", title: "Client Stakeholder", color: "#ec4899", lastActive: minutesAgo(60 * 26) },
  { id: "u6", name: "Mei Tanaka", email: "mei@kestrelstudio.example", title: "Designer", color: "#eab308", lastActive: minutesAgo(60 * 5) },
  { id: "u7", name: "Dana Kim", email: "dana@lumencoffee.com", title: "Marketing Lead", color: "#b45309", lastActive: minutesAgo(30) },
  { id: "u8", name: "Leo Grant", email: "leo@atlasoutdoor.co", title: "Brand Director", color: "#15803d", lastActive: minutesAgo(90) },
  { id: "u9", name: "Sam Rivera", email: "sam@example.com", title: "Freelance Editor", color: "#64748b", lastActive: minutesAgo(5) },
];
