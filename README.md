# Social Connect

A workspace-based social media manager for agencies and in-house teams: plan, preview, schedule, approve and track content across Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Pinterest and Threads. Next.js (App Router) + TypeScript + Tailwind CSS.

It runs entirely on mock data. There is no backend, real sign-in, email delivery, social network connection or publishing. See [docs/production-architecture.md](docs/production-architecture.md) for the proposed schema and migration plan.

```bash
npm install
npm run dev      # http://localhost:3000
```

## Workspaces in one minute

- A **user** is one global account. A **workspace** is an independent environment (agency, brand, client) with its own posts, accounts, media, inbox, analytics, settings and members.
- **Roles are per workspace** (Admin, Manager, Editor, Viewer). The same person can be Admin in one workspace and Viewer in another.
- **Ownership is separate from membership.** Each workspace has one owner (always an Admin). On the Free plan an account can *own* one workspace and *join* any number by invitation.
- Switch workspaces from the top of the sidebar (or the header on phones). Every page reloads for the selected workspace.

## Demo identities

The dashed **Demo** menu in the header is a simulated sign-in, not authentication. Pick a seeded account to see the app as them:

| Account | Kestrel Studio | Lumen Coffee | Atlas Outdoor | Harbor Health |
|---|---|---|---|---|
| Jordan Lee | **Owner**, Admin | Editor | Viewer | invited as Manager |
| Priya Shah | Manager | invited as Viewer | Admin | **Owner**, Admin |
| Dana Kim | | **Owner**, Admin | | |
| Leo Grant | | | **Owner**, Admin | |
| Sam Rivera | invited as Editor | | | |

Sam starts with no workspace, so you can try accepting an invitation and creating a first workspace. The Demo menu can also *preview* a lower role in the current workspace. That only hides controls; the API still checks the real role.

Data is in memory and resets on a full reload.

## Where things are

| Path | What |
|---|---|
| `lib/data/api.ts` | **Mock API, acting as the server.** It reads the demo session, verifies workspace membership and permissions on every call, and scopes every record by workspace. Replace function bodies with real endpoints to go live. |
| `lib/data/store.tsx` | Client store: session, workspace list, the active workspace's data (cleared on switch), and actions that surface API errors as toasts. |
| `lib/permissions.ts` | The only place roles are mapped to permissions, plus resource rules (edit or delete own post, which roles a person may invite). Used by both the API and the UI. |
| `lib/plans.ts` | Plan entitlements (Free: own 1 workspace). |
| `lib/mock/` | Seed data: users, workspaces, memberships, invitations, and per-workspace content. Only `api.ts` imports it. |
| `lib/networks.ts`, `lib/validate.ts` | Per-network limits and the Compose preview checks. |
| `components/workspace/` | Workspace switcher, create dialog, invitations list, demo menu. |
| `docs/production-architecture.md` | Proposed Postgres schema, enforcement strategy and migration plan. |
