import * as apiNs from "../lib/data/api";
import * as stateNs from "../lib/server/state";
import * as fixturesNs from "./fixtures";
import * as errNs from "../lib/data/errors";
// tsx may load these as CommonJS, where named exports sit under .default.
const unwrap = <T,>(ns: T) => (ns as T & { default?: T }).default ?? ns;
const api = unwrap(apiNs);
const { ApiError } = unwrap(errNs);
type ApiError = InstanceType<typeof ApiError>;
const { replaceState, state } = unwrap(stateNs);
const { fixtureState } = unwrap(fixturesNs);
const actAs = (id: string | null) => api.actAsForTests(id);

replaceState(fixtureState());

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };
async function rejects(name: string, p: Promise<unknown>, code: string) {
  try { await p; ok(name, false, "expected " + code + " but succeeded"); }
  catch (e) { ok(name, e instanceof ApiError && e.code === code, e instanceof ApiError ? `${e.code}: ${e.message}` : String(e)); }
}
const NW = "ws_kestrel", LU = "ws_lumen", AT = "ws_atlas", HA = "ws_harbor";

// --- Isolation
actAs("u1");
const lumenPosts = await api.listPosts(LU);
ok("Lumen post list contains only Lumen posts", lumenPosts.length > 0 && lumenPosts.every((p) => p.workspaceId === LU));
await rejects("Kestrel Studio post ID via Lumen workspace is not found", api.updatePost(LU, "p1", { content: "x" }), "not_found");
await rejects("Kestrel Studio media ID can't be attached in Lumen", api.createPost(LU, { content: "hi", networks: ["instagram"], mediaIds: ["m1"], scheduledAt: null, status: "draft" }), "not_found");
await rejects("Non-member workspace is 'not found' (Harbor for Jordan)", api.listPosts(HA), "not_found");
await rejects("Unknown workspace ID is 'not found'", api.listPosts("ws_doesnotexist"), "not_found");
actAs("u9");
await rejects("User with no memberships can't read Kestrel Studio", api.listMembers(NW), "not_found");

// --- Role independence (Jordan: Admin NW, Editor LU, Viewer AT)
actAs("u1");
const ws = await api.listMyWorkspaces();
ok("Jordan's roles differ per workspace", JSON.stringify(ws.map((w) => [w.workspace.id, w.role, w.isOwner])) === JSON.stringify([[NW, "Admin", true], [AT, "Viewer", false], [LU, "Editor", false]]), JSON.stringify(ws.map((w) => [w.workspace.name, w.role])));
ok("Admin in Kestrel Studio can change roles there", !!(await api.updateMemberRole(NW, "u5", "Viewer")));
await rejects("…but the same call in Lumen (Editor) is forbidden", api.updateMemberRole(LU, "u6", "Editor"), "forbidden");
await rejects("Viewer in Atlas can't create posts", api.createPost(AT, { content: "x", networks: ["x"], mediaIds: [], scheduledAt: null, status: "draft" }), "forbidden");
await rejects("Editor in Lumen can't approve (own pending post lp1)", api.updatePost(LU, "lp1", { status: "scheduled" }), "forbidden");
await rejects("Editor can't edit someone else's post (lp2 by Sofia)", api.updatePost(LU, "lp2", { content: "edited" }), "forbidden");
ok("Editor can edit own draft (lp4)", (await api.updatePost(LU, "lp4", { content: "Roastery tour, updated" })).content.includes("updated"));
await rejects("Editor can't export analytics", api.exportAnalyticsCsv(LU, { since: "2000-01-01", network: "all" }), "forbidden");
await rejects("Can't publish via the API", api.updatePost(NW, "p1", { status: "published" }), "invalid");
const created = await api.createPost(LU, { content: "author test", networks: ["instagram"], mediaIds: ["lm1"], scheduledAt: null, status: "draft" });
ok("Author is taken from the session, not the client", created.authorId === "u1" && created.workspaceId === LU);

// --- Creation limit
// --- Plans (Jordan is seeded on Pro; Lumen's owner on Free; Atlas's owner on Agency)
const dates = (rows: { date: string }[]) => new Set(rows.map((r) => r.date)).size;
ok("Pro workspace (Kestrel) shows 12 months of analytics", dates((await api.getAnalytics(NW)).daily) === 365);
ok("Free owner's workspace (Lumen) shows 30 days, even to a Pro member", dates((await api.getAnalytics(LU)).daily) === 30);
ok("Agency owner's workspace (Atlas) shows 12 months to a Viewer", dates((await api.getAnalytics(AT)).daily) === 365);
const csv = await api.exportAnalyticsCsv(NW, { since: "2000-01-01", network: "all" });
ok("Pro export works and is clamped to the plan's history", csv.split("\n").length > 1 && csv.split("\n").slice(1).every((l) => l.slice(0, 10) >= (new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10))));
await rejects("Unknown plan is rejected", api.changePlan("gold" as never), "invalid");
ok("Downgrade to Free allowed while owning 1", (await api.changePlan("free")).id === "free" && (await api.getSession()).plan.id === "free");
await rejects("Jordan (owns 1, Free) can't create another workspace", api.createWorkspace({ name: "Second" }), "limit_reached");
await rejects("Free workspace can't export CSV, even as Admin", api.exportAnalyticsCsv(NW, { since: "2000-01-01", network: "all" }), "upgrade_required");
ok("Free workspace now shows 30 days", dates((await api.getAnalytics(NW)).daily) === 30);
ok("Workspace list reports the owner's plan", (await api.listMyWorkspaces()).find((w) => w.workspace.id === NW)?.plan.id === "free");
await api.changePlan("pro");
const second = await api.createWorkspace({ name: "Second" });
ok("Back on Pro, Jordan can own a second workspace", (await api.getSession()).ownedWorkspaceCount === 2);
await rejects("Downgrade to Free refused while owning 2", api.changePlan("free"), "conflict");
ok("Plan unchanged after refused downgrade", (await api.getSession()).plan.id === "pro" && !!second.id);
actAs("u9");
const results = await Promise.allSettled([api.createWorkspace({ name: "Sam A" }), api.createWorkspace({ name: "Sam B" })]);
ok("Two concurrent creates by a Free user: exactly one succeeds", results.filter((r) => r.status === "fulfilled").length === 1 && results.some((r) => r.status === "rejected" && (r.reason as ApiError).code === "limit_reached"));
const samWs = (results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ id: string }>).value.id;
const samSession = await api.getSession();
ok("Sam now owns 1 workspace", samSession.ownedWorkspaceCount === 1);
const fresh = await api.listPosts(samWs);
ok("New workspace starts empty", fresh.length === 0 && (await api.listAccounts(samWs)).every((a) => !a.connected));

// --- Invitations (invitee side) — joining doesn't consume the allowance
const myInv = await api.listMyInvitations();
ok("Sam sees his pending Kestrel Studio invitation", myInv.some((i) => i.invitation.workspaceId === NW));
await rejects("Sam can't answer Jordan's invitation (inv1)", api.acceptInvitation("inv1"), "not_found");
const acc = await api.acceptInvitation("inv2");
ok("Accepting joins Kestrel Studio with the invited role", acc.workspaceId === NW && acc.role === "Editor");
await rejects("Accepting again is rejected", api.acceptInvitation("inv2"), "invalid");
ok("Joining didn't change owned count", (await api.getSession()).ownedWorkspaceCount === 1 && (await api.listMyWorkspaces()).length === 2);

// --- Invitations (workspace side) and escalation
actAs("u2"); // Manager in Kestrel Studio
await rejects("Manager can't invite an Admin", api.inviteMember(NW, { email: "boss@x.example", role: "Admin" }), "forbidden");
const inv = await api.inviteMember(NW, { email: "New.Person@Example.org", role: "Viewer" });
ok("Manager can invite a Viewer; email normalized; no email claimed", inv.invitation.email === "new.person@example.org" && inv.emailSent === false && inv.accountExists === false);
await rejects("Duplicate active invitation rejected", api.inviteMember(NW, { email: "new.person@example.org", role: "Editor" }), "conflict");
await rejects("Inviting an existing member rejected", api.inviteMember(NW, { email: "marcus@kestrelstudio.example", role: "Editor" }), "conflict");
await rejects("Manager can't change roles", api.updateMemberRole(NW, "u3", "Viewer"), "forbidden");
actAs("u1");
const list = await api.listInvitations(NW);
ok("Seeded past-expiry invitation reports 'expired'", list.find((i) => i.id === "inv4")?.status === "expired");
ok("Accepted invitation reports 'accepted'", list.find((i) => i.id === "inv2")?.status === "accepted");
ok("Re-inviting an email whose invitation expired is allowed", (await api.inviteMember(NW, { email: "nina@studio.example", role: "Viewer" })).invitation.status === "pending");
ok("…and the old one is now stored as expired", (await api.listInvitations(NW)).find((i) => i.id === "inv4")?.status === "expired");
await rejects("…and can't be renewed into a second pending invite", api.resendInvitation(NW, "inv4"), "conflict");
const nina = (await api.listInvitations(NW)).find((i) => i.email === "nina@studio.example" && i.status === "pending")!;
ok("Resending the live invitation renews it", (await api.resendInvitation(NW, nina.id)).invitation.sendCount === 2);
ok("Revoke works on pending", (await api.revokeInvitation(NW, "inv3")).status === "revoked");
await rejects("Revoking twice is rejected", api.revokeInvitation(NW, "inv3"), "invalid");
actAs("u7"); // Lumen Admin
await rejects("Lumen admin can't revoke Kestrel Studio invitation by ID", api.revokeInvitation(LU, "inv4"), "not_found");

// --- Ownership and last-admin safeguards
actAs("u1");
await rejects("Owner can't leave", api.leaveWorkspace(NW), "conflict");
await rejects("Owner's role can't be lowered", (actAs("u1"), api.updateMemberRole(NW, "u1", "Editor")), "conflict");
await rejects("Can't remove yourself via remove", api.removeMember(NW, "u1"), "invalid");
await rejects("Transfer requires target to be Admin", api.transferOwnership(NW, "u2"), "invalid");
await api.updateMemberRole(NW, "u2", "Admin");
await rejects("Transfer blocked: Priya already owns Harbor (Free limit)", api.transferOwnership(NW, "u2"), "limit_reached");
actAs("u2");
await rejects("Non-owner Admin can't transfer", api.transferOwnership(NW, "u1"), "forbidden");
await rejects("Non-owner can't remove the owner", api.removeMember(NW, "u1"), "conflict");
await rejects("Sole Admin+owner of Harbor can't leave", api.leaveWorkspace(HA), "conflict");
actAs("u8"); // Atlas owner; Priya is the other Admin
ok("With two Admins, one can be demoted", !!(await api.updateMemberRole(AT, "u2", "Editor")));
await rejects("…but Atlas owner (last Admin) can't be demoted", api.updateMemberRole(AT, "u8", "Manager"), "conflict");
actAs("u1");
ok("Viewer can leave Atlas", !!(await api.leaveWorkspace(AT)));
await rejects("…and then loses access", api.listPosts(AT), "not_found");

// --- Inbox assignment validity
await rejects("Can't assign a conversation to a Viewer", api.updateInboxItem(NW, "i1", { assigneeId: "u5" }), "invalid");
await rejects("Can't assign to a non-member", api.updateInboxItem(NW, "i1", { assigneeId: "u7" }), "invalid");

// --- Sign-in
actAs(null);
await rejects("Signed-out caller gets unauthenticated", api.getSession(), "unauthenticated");
ok("Wrong password is refused", api.checkPassword("jordan@kestrelstudio.example", "nope") === null);
ok("Fixture password signs Jordan in (email is case-insensitive)", api.checkPassword("Jordan@KestrelStudio.example", "fixture-password") === "u1");
const newId = api.registerUser({ name: "Rae Park", email: "rae@example.com", password: "long-enough" });
ok("Sign-up stores a hash, not the password", !JSON.stringify(state().passwords[newId]).includes("long-enough"));
try { api.registerUser({ name: "Rae Again", email: "RAE@example.com", password: "long-enough" }); ok("Duplicate email is refused", false); }
catch (e) { ok("Duplicate email is refused", e instanceof ApiError && e.code === "conflict"); }
try { api.registerUser({ name: "Short", email: "short@example.com", password: "short" }); ok("Short password is refused", false); }
catch (e) { ok("Short password is refused", e instanceof ApiError && e.code === "invalid"); }

// --- Only allowed fields are taken from the browser
actAs("u1");
const moved = await api.updatePost(NW, "p1", { content: "edited", workspaceId: LU, authorId: "u7", id: "hijack" } as never);
ok("updatePost ignores workspaceId, authorId and id", moved.workspaceId === NW && moved.id === "p1" && moved.authorId !== "u7");
const made = await api.createPost(NW, { content: "x", networks: ["x"], mediaIds: [], scheduledAt: null, status: "draft", authorId: "u7", comments: [{ id: "c" }] } as never);
ok("createPost ignores injected author and comments", made.authorId === "u1" && made.comments.length === 0);
await rejects("Unknown network in a post is refused", api.createPost(NW, { content: "x", networks: ["myspace"], mediaIds: [], scheduledAt: null, status: "draft" } as never), "invalid");

// --- Connecting accounts
const sealed = (externalId: string) => ({ externalId, name: `Page ${externalId}`, handle: `@p${externalId}`, followers: 10, avatarUrl: null, encryptedToken: `secret-${externalId}` });
actAs("u2"); // Priya: Manager in Kestrel, can manage accounts
const attemptKey = api.beginConnection(NW, "facebook", null);
actAs("u5"); // Mei: Viewer in Kestrel
try { api.beginConnection(NW, "facebook", null); ok("Viewer can't start a connection", false); }
catch (e) { ok("Viewer can't start a connection", e instanceof ApiError && e.code === "forbidden"); }
try { api.takeConnectionAttempt(attemptKey, "facebook"); ok("Another user can't finish someone's connection", false); }
catch (e) { ok("Another user can't finish someone's connection", e instanceof ApiError && e.code === "invalid"); }
actAs("u2");
try { api.takeConnectionAttempt(attemptKey, "facebook"); ok("A connection attempt is single-use", false); }
catch (e) { ok("A connection attempt is single-use", e instanceof ApiError && e.code === "invalid"); }
const key2 = api.beginConnection(NW, "facebook", null);
const attempt = api.takeConnectionAttempt(key2, "facebook");
ok("The attempt carries its workspace", attempt.workspaceId === NW);
const multi = api.finishConnection(NW, "facebook", [sealed("1"), sealed("2")]);
ok("Several pages lead to a choice", !multi.connected);
const pending = await api.getPendingConnection((multi as { choiceId: string }).choiceId);
ok("The choice lists pages without tokens", pending.options.length === 2 && !JSON.stringify(pending).includes("secret-"));
actAs("u1");
await rejects("Someone else can't use the choice", api.getPendingConnection((multi as { choiceId: string }).choiceId), "not_found");
actAs("u2");
const fb = await api.completePendingConnection((multi as { choiceId: string }).choiceId, "2");
ok("Choosing connects that page", fb.connected && fb.externalId === "2" && fb.name === "Page 2");
ok("Account list never includes tokens", !JSON.stringify(await api.listAccounts(NW)).includes("secret-"));
ok("Token is stored server-side", Object.values(state().accountTokens).includes("secret-2"));
await api.disconnectAccount(NW, fb.id);
ok("Disconnect deletes the stored token", !Object.values(state().accountTokens).includes("secret-2"));

// --- Uploaded files
const file = await api.uploadMedia(NW, { name: "a.png", mimeType: "image/png", data: Buffer.from("png-bytes") }, { width: 10, height: 20 });
ok("Upload stores the file and serves it from the app", file.src === `/api/media/${file.id}` && api.runAs("u1", () => api.readMediaFile(file.id)).data.toString() === "png-bytes");
await rejects("Non-media uploads are refused", api.uploadMedia(NW, { name: "a.exe", mimeType: "application/x-msdownload", data: Buffer.from("x") }, { width: 1, height: 1 }), "invalid");
try { api.runAs("u7", () => api.readMediaFile(file.id)); ok("Non-members can't download a workspace's file", false); }
catch (e) { ok("Non-members can't download a workspace's file", e instanceof ApiError && e.code === "not_found"); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
