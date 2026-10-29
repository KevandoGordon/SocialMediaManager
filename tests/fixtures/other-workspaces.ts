/** Seed content for the non-Kestrel test workspaces. Harbor Health is intentionally empty. */
import { placeholderAccounts } from "../../lib/defaults";
import type { Account, InboxItem, MediaItem, Mention, Post } from "../../lib/types";
import { at, inWorkspace, minutesAgo } from "./helpers";
import { ATLAS, HARBOR, LUMEN } from "./workspaces";

export const otherAccounts: Account[] = [
  ...inWorkspace<Account>(LUMEN, [
    { id: "la1", network: "instagram", name: "Lumen Coffee", handle: "@lumencoffee", connected: true, followers: 38_200, lastSync: minutesAgo(6) },
    { id: "la2", network: "facebook", name: "Lumen Coffee Roasters", handle: "facebook.com/lumencoffee", connected: true, followers: 12_900, lastSync: minutesAgo(9) },
    { id: "la3", network: "tiktok", name: "Lumen Coffee", handle: "@lumen.coffee", connected: true, followers: 61_500, lastSync: minutesAgo(11) },
    { id: "la4", network: "pinterest", name: "Lumen Coffee", handle: "lumencoffee", connected: true, followers: 4_300, lastSync: minutesAgo(40) },
    { id: "la5", network: "x", name: "Lumen Coffee", handle: "@lumencoffee", connected: false, followers: 2_100, lastSync: null },
    { id: "la6", network: "linkedin", name: "Lumen Coffee", handle: "lumen-coffee", connected: false, followers: 900, lastSync: null },
    { id: "la7", network: "youtube", name: "Lumen Coffee", handle: "@lumencoffee", connected: false, followers: 0, lastSync: null },
    { id: "la8", network: "threads", name: "Lumen Coffee", handle: "@lumencoffee", connected: true, followers: 5_600, lastSync: minutesAgo(15) },
  ]),
  ...inWorkspace<Account>(ATLAS, [
    { id: "aa1", network: "instagram", name: "Atlas Outdoor", handle: "@atlasoutdoor", connected: true, followers: 142_000, lastSync: minutesAgo(3) },
    { id: "aa2", network: "youtube", name: "Atlas Outdoor", handle: "@atlasoutdoor", connected: true, followers: 88_400, lastSync: minutesAgo(20) },
    { id: "aa3", network: "pinterest", name: "Atlas Outdoor", handle: "atlasoutdoor", connected: true, followers: 27_300, lastSync: minutesAgo(25) },
    { id: "aa4", network: "facebook", name: "Atlas Outdoor", handle: "facebook.com/atlasoutdoor", connected: true, followers: 64_100, lastSync: minutesAgo(5) },
    { id: "aa5", network: "x", name: "Atlas Outdoor", handle: "@atlas_outdoor", connected: true, followers: 19_800, lastSync: minutesAgo(7) },
    { id: "aa6", network: "linkedin", name: "Atlas Outdoor Co.", handle: "atlas-outdoor", connected: false, followers: 8_200, lastSync: null },
    { id: "aa7", network: "tiktok", name: "Atlas Outdoor", handle: "@atlasoutdoor", connected: false, followers: 0, lastSync: null },
    { id: "aa8", network: "threads", name: "Atlas Outdoor", handle: "@atlasoutdoor", connected: false, followers: 0, lastSync: null },
  ]),
  ...placeholderAccounts(HARBOR, "Harbor Health", "ha"),
];

export const otherMedia: MediaItem[] = [
  ...inWorkspace<MediaItem>(LUMEN, [
    { id: "lm1", name: "pour-over-closeup.jpg", type: "image", width: 1600, height: 2000, sizeKb: 610, tags: ["coffee", "product"], hues: [28, 15], createdAt: at(-9) },
    { id: "lm2", name: "barista-latte-art.mp4", type: "video", width: 1080, height: 1920, sizeKb: 21_300, durationSec: 27, tags: ["reel", "barista"], hues: [35, 330], createdAt: at(-6) },
    { id: "lm3", name: "seasonal-menu.png", type: "image", width: 1080, height: 1350, sizeKb: 290, tags: ["menu", "seasonal"], hues: [20, 50], createdAt: at(-4) },
    { id: "lm4", name: "roastery-tour.jpg", type: "image", width: 2400, height: 1600, sizeKb: 880, tags: ["roastery", "bts"], hues: [15, 200], createdAt: at(-2) },
  ]),
  ...inWorkspace<MediaItem>(ATLAS, [
    { id: "am1", name: "summit-sunrise.jpg", type: "image", width: 2400, height: 1600, sizeKb: 1_020, tags: ["landscape", "hero"], hues: [200, 30], createdAt: at(-11) },
    { id: "am2", name: "tent-pitch-howto.mp4", type: "video", width: 1920, height: 1080, sizeKb: 64_000, durationSec: 212, tags: ["tutorial", "camping"], hues: [120, 160], createdAt: at(-8) },
    { id: "am3", name: "trail-pack-flatlay.jpg", type: "image", width: 1000, height: 1500, sizeKb: 450, tags: ["gear", "product"], hues: [90, 40], createdAt: at(-5) },
  ]),
];

export const otherPosts: Post[] = [
  ...inWorkspace<Post>(LUMEN, [
    { id: "lp1", content: "Pumpkin spice is back, but make it single-origin 🎃☕ Our seasonal Ethiopia pour-over is on the menu from today.", networks: ["instagram", "facebook", "threads"], mediaIds: ["lm1"], scheduledAt: at(1, 7, 30), status: "pending", authorId: "u1", createdAt: at(-1, 10), campaign: "Autumn menu", comments: [] },
    { id: "lp2", content: "Latte art, slowed down. Tag someone who still draws hearts 🤎", networks: ["tiktok", "instagram"], mediaIds: ["lm2"], scheduledAt: at(3, 12, 0), status: "scheduled", authorId: "u4", createdAt: at(-2, 15), comments: [{ id: "lc1", authorId: "u7", body: "Perfect. Approved!", createdAt: at(-1, 9) }] },
    { id: "lp3", content: "New seasonal menu: maple oat latte, cardamom cold brew, and the return of the fig scone.", networks: ["instagram", "pinterest"], mediaIds: ["lm3"], scheduledAt: at(-3, 8, 0), status: "published", authorId: "u7", createdAt: at(-6, 11), comments: [] },
    { id: "lp4", content: "Ever wondered what happens between farm and cup? Join our Saturday roastery tour.", networks: ["facebook", "instagram"], mediaIds: ["lm4"], scheduledAt: null, status: "draft", authorId: "u1", createdAt: minutesAgo(400), comments: [] },
    { id: "lp5", content: "Monday fuel ☕", networks: ["threads"], mediaIds: [], scheduledAt: at(-8, 7, 0), status: "published", authorId: "u4", createdAt: at(-9, 10), comments: [] },
  ]),
  ...inWorkspace<Post>(ATLAS, [
    { id: "ap1", content: "Sunrise from 4,200m. Worth every switchback. 🏔️ #AtlasOutdoor #GetOutside", networks: ["instagram", "facebook", "x"], mediaIds: ["am1"], scheduledAt: at(2, 6, 0), status: "scheduled", authorId: "u8", createdAt: at(-1, 18), campaign: "Summit series", comments: [] },
    { id: "ap2", content: "How to pitch a tent in the wind (without losing your mind)\nOur field team walks through the three-stake method step by step.", networks: ["youtube"], mediaIds: ["am2"], scheduledAt: at(4, 15, 0), status: "draft", authorId: "u3", createdAt: minutesAgo(600), comments: [] },
    { id: "ap3", content: "Everything in our 48-hour trail pack, laid out. Save for your next trip.", networks: ["pinterest", "instagram"], mediaIds: ["am3"], scheduledAt: at(-4, 10, 0), status: "published", authorId: "u2", createdAt: at(-7, 10), comments: [] },
    { id: "ap4", content: "Gear check: what's the one item you never hike without?", networks: ["x", "facebook"], mediaIds: [], scheduledAt: at(-1, 17, 0), status: "published", authorId: "u8", createdAt: at(-3, 10), comments: [] },
  ]),
];

export const otherInbox: InboxItem[] = [
  ...inWorkspace<InboxItem>(LUMEN, [
    { id: "li1", network: "instagram", kind: "comment", from: { name: "Mara", handle: "@mara.sips" }, body: "Is the fig scone vegan?", receivedAt: minutesAgo(20), postId: "lp3", assigneeId: null, status: "open", read: false, replies: [] },
    { id: "li2", network: "facebook", kind: "dm", from: { name: "Chris Allen", handle: "chris.allen" }, body: "Do you do wholesale for offices?", receivedAt: minutesAgo(180), assigneeId: "u4", status: "open", read: true, replies: [] },
    { id: "li3", network: "tiktok", kind: "comment", from: { name: "beanz", handle: "@beanz" }, body: "what milk is that 👀", receivedAt: minutesAgo(400), assigneeId: null, status: "open", read: false, replies: [] },
  ]),
  ...inWorkspace<InboxItem>(ATLAS, [
    { id: "ai1", network: "youtube", kind: "comment", from: { name: "Trail Tom", handle: "@trailtom" }, body: "Which tent is this in the video?", receivedAt: minutesAgo(60), assigneeId: "u3", status: "open", read: false, replies: [] },
    { id: "ai2", network: "instagram", kind: "dm", from: { name: "Kai Moana", handle: "@kai.moana" }, body: "Would love to collaborate on a summit shoot!", receivedAt: minutesAgo(800), assigneeId: null, status: "open", read: true, replies: [] },
  ]),
];

export const otherMentions: Mention[] = [
  ...inWorkspace<Mention>(LUMEN, [
    { id: "ln1", network: "instagram", author: "Portland Eats", handle: "@pdxeats", body: "Lumen Coffee's cardamom cold brew is the drink of the season.", sentiment: "positive", reach: 44_000, createdAt: minutesAgo(90) },
    { id: "ln2", network: "x", author: "Joel", handle: "@joelw", body: "Lumen on 5th was out of oat milk again this morning", sentiment: "negative", reach: 800, createdAt: minutesAgo(300) },
    { id: "ln3", network: "tiktok", author: "cafe crawl", handle: "@cafecrawl", body: "Ranking every Lumen Coffee drink so you don't have to", sentiment: "neutral", reach: 120_000, createdAt: minutesAgo(1200) },
  ]),
  ...inWorkspace<Mention>(ATLAS, [
    { id: "an1", network: "youtube", author: "Gear Lab", handle: "@gearlab", body: "Atlas Outdoor Ridge 2 tent: 6 months later — still holding up.", sentiment: "positive", reach: 210_000, createdAt: minutesAgo(240) },
    { id: "an2", network: "facebook", author: "Hiking Collective", handle: "hikingcollective", body: "Anyone tried Atlas boots for wide feet?", sentiment: "neutral", reach: 15_000, createdAt: minutesAgo(700) },
  ]),
];
