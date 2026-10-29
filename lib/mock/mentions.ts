import type { Mention } from "../types";
import { inWorkspace, minutesAgo } from "./helpers";
import { NORTHWIND } from "./workspaces";

export const mentions = inWorkspace<Mention>(NORTHWIND, [
  { id: "n1", network: "x", author: "Kelsey Tran", handle: "@kelseyt", body: "Shoutout to @northwind for the fastest customer support I've had all year. Replacement arrived in 2 days.", sentiment: "positive", reach: 18_400, createdAt: minutesAgo(15) },
  { id: "n2", network: "instagram", author: "Style by Noor", handle: "@stylebynoor", body: "Styled the new Northwind autumn coat three ways — link in bio. Honestly the best fit I've found this year.", sentiment: "positive", reach: 92_000, createdAt: minutesAgo(48) },
  { id: "n3", network: "threads", author: "Ben Ortega", handle: "@ben.ortega", body: "Anyone else waiting on a Northwind order? Mine's been 'processing' for a week.", sentiment: "negative", reach: 2_100, createdAt: minutesAgo(95) },
  { id: "n4", network: "linkedin", author: "Grace Okafor", handle: "grace-okafor", body: "Great webinar from the Northwind team on lean content operations. Some useful templates in there.", sentiment: "positive", reach: 6_700, createdAt: minutesAgo(160) },
  { id: "n5", network: "tiktok", author: "thriftqueen", handle: "@thriftqueen", body: "northwind vs. the high-street dupe — honest comparison 👀", sentiment: "neutral", reach: 240_000, createdAt: minutesAgo(240) },
  { id: "n6", network: "facebook", author: "Local Living Mag", handle: "locallivingmag", body: "Northwind is opening a pop-up downtown this weekend. Details below.", sentiment: "neutral", reach: 31_000, createdAt: minutesAgo(410) },
  { id: "n7", network: "x", author: "Dev Mehta", handle: "@devm", body: "Northwind's site checkout broke twice on me today. Not great.", sentiment: "negative", reach: 4_300, createdAt: minutesAgo(520) },
  { id: "n8", network: "youtube", author: "The Wardrobe Edit", handle: "@wardrobeedit", body: "Northwind autumn haul + try-on. Sizing runs slightly large.", sentiment: "neutral", reach: 58_000, createdAt: minutesAgo(800) },
  { id: "n9", network: "pinterest", author: "Cozy Corners", handle: "cozycorners", body: "Saved: Northwind autumn lookbook — perfect palette inspo.", sentiment: "positive", reach: 12_500, createdAt: minutesAgo(1100) },
  { id: "n10", network: "instagram", author: "Leah M.", handle: "@leahm", body: "@northwind the zipper on my jacket broke after a month 😕", sentiment: "negative", reach: 1_200, createdAt: minutesAgo(1400) },
  { id: "n11", network: "threads", author: "Oli", handle: "@oli.makes", body: "Northwind's office dog content is the only content I need", sentiment: "positive", reach: 3_900, createdAt: minutesAgo(1700) },
  { id: "n12", network: "linkedin", author: "Retail Weekly", handle: "retail-weekly", body: "Northwind among five DTC brands growing community-led sales in Q3.", sentiment: "neutral", reach: 22_000, createdAt: minutesAgo(2200) },
]);
