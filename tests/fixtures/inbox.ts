import type { InboxItem } from "../../lib/types";
import { inWorkspace, minutesAgo } from "./helpers";
import { KESTREL } from "./workspaces";

export const inbox = inWorkspace<InboxItem>(KESTREL, [
  { id: "i1", network: "instagram", kind: "comment", from: { name: "Hana K.", handle: "@hanakwrites" }, body: "Is the camel coat available in petite sizes? 😍", receivedAt: minutesAgo(8), postId: "p5", assigneeId: null, status: "open", read: false, replies: [] },
  { id: "i2", network: "facebook", kind: "dm", from: { name: "Daniel Ortiz", handle: "daniel.ortiz" }, body: "Hi! My order #4821 hasn't shipped yet and it's been 6 days. Can you check?", receivedAt: minutesAgo(25), assigneeId: "u4", status: "open", read: false, replies: [] },
  { id: "i3", network: "x", kind: "comment", from: { name: "Ravi", handle: "@ravibuilds" }, body: "Those Q3 numbers are wild. What drove the jump in saves?", receivedAt: minutesAgo(70), postId: "p4", assigneeId: null, status: "open", read: true, replies: [] },
  { id: "i4", network: "linkedin", kind: "dm", from: { name: "Claire Dubois", handle: "claire-dubois" }, body: "Hello — I lead marketing at Atelier Nord. Would love to explore a partnership for the holiday season.", receivedAt: minutesAgo(140), assigneeId: "u2", status: "open", read: true, replies: [] },
  { id: "i5", network: "tiktok", kind: "comment", from: { name: "lucy 🌙", handle: "@lucymoon" }, body: "need the song name pls", receivedAt: minutesAgo(200), assigneeId: null, status: "open", read: false, replies: [] },
  { id: "i6", network: "instagram", kind: "dm", from: { name: "Tom Becker", handle: "@tombecker" }, body: "Received a damaged item, photos attached. What should I do?", receivedAt: minutesAgo(320), assigneeId: "u4", status: "open", read: true, replies: [{ id: "r1", authorId: "u4", body: "So sorry, Tom! Sending you a prepaid return label by email now.", createdAt: minutesAgo(300) }] },
  { id: "i7", network: "youtube", kind: "comment", from: { name: "Ana Lima", handle: "@analima" }, body: "Great tutorial, more of these please!", receivedAt: minutesAgo(600), assigneeId: null, status: "done", read: true, replies: [{ id: "r2", authorId: "u3", body: "Thank you Ana! Another one drops next week 🙌", createdAt: minutesAgo(590) }] },
  { id: "i8", network: "threads", kind: "comment", from: { name: "Sam P.", handle: "@sam.p" }, body: "Biscuit for CEO 2026", receivedAt: minutesAgo(900), postId: "p5", assigneeId: null, status: "open", read: true, replies: [] },
  { id: "i9", network: "pinterest", kind: "comment", from: { name: "Mira", handle: "miradesigns" }, body: "Where can I buy the scarf in pin #2?", receivedAt: minutesAgo(1300), assigneeId: "u3", status: "open", read: true, replies: [] },
  { id: "i10", network: "facebook", kind: "comment", from: { name: "Gary Holt", handle: "gary.holt" }, body: "Prices went up again? Not impressed.", receivedAt: minutesAgo(1500), assigneeId: null, status: "open", read: true, replies: [] },
]);
