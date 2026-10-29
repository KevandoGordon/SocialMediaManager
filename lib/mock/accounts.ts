import type { Account } from "../types";
import { inWorkspace, minutesAgo } from "./helpers";
import { KESTREL } from "./workspaces";

export const accounts = inWorkspace<Account>(KESTREL, [
  { id: "a1", network: "facebook", name: "Kestrel Studio", handle: "facebook.com/kestrelstudio", connected: true, followers: 128_400, lastSync: minutesAgo(4) },
  { id: "a2", network: "instagram", name: "Kestrel Studio", handle: "@kestrelstudio", connected: true, followers: 50_210, lastSync: minutesAgo(4) },
  { id: "a3", network: "x", name: "Kestrel Studio", handle: "@kestrelstudio", connected: true, followers: 22_870, lastSync: minutesAgo(6) },
  { id: "a4", network: "linkedin", name: "Kestrel Studio", handle: "kestrel-studio", connected: true, followers: 14_300, lastSync: minutesAgo(10) },
  { id: "a5", network: "tiktok", name: "Kestrel Studio", handle: "@kestrelstudio", connected: true, followers: 87_900, lastSync: minutesAgo(8) },
  { id: "a6", network: "youtube", name: "Kestrel Studio", handle: "@kestrelstudio", connected: true, followers: 9_840, lastSync: minutesAgo(30) },
  { id: "a7", network: "pinterest", name: "Kestrel Studio", handle: "kestrelstudio", connected: false, followers: 6_120, lastSync: null },
  { id: "a8", network: "threads", name: "Kestrel Studio", handle: "@kestrelstudio", connected: true, followers: 11_450, lastSync: minutesAgo(12) },
]);
