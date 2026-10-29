import type { Account } from "../types";
import { inWorkspace, minutesAgo } from "./helpers";
import { NORTHWIND } from "./workspaces";

export const accounts = inWorkspace<Account>(NORTHWIND, [
  { id: "a1", network: "facebook", name: "Northwind", handle: "facebook.com/northwind", connected: true, followers: 128_400, lastSync: minutesAgo(4) },
  { id: "a2", network: "instagram", name: "Northwind", handle: "@northwind", connected: true, followers: 50_210, lastSync: minutesAgo(4) },
  { id: "a3", network: "x", name: "Northwind", handle: "@northwind", connected: true, followers: 22_870, lastSync: minutesAgo(6) },
  { id: "a4", network: "linkedin", name: "Northwind Agency", handle: "northwind-agency", connected: true, followers: 14_300, lastSync: minutesAgo(10) },
  { id: "a5", network: "tiktok", name: "Northwind", handle: "@northwind", connected: true, followers: 87_900, lastSync: minutesAgo(8) },
  { id: "a6", network: "youtube", name: "Northwind Studio", handle: "@northwindstudio", connected: true, followers: 9_840, lastSync: minutesAgo(30) },
  { id: "a7", network: "pinterest", name: "Northwind", handle: "northwind", connected: false, followers: 6_120, lastSync: null },
  { id: "a8", network: "threads", name: "Northwind", handle: "@northwind", connected: true, followers: 11_450, lastSync: minutesAgo(12) },
]);
