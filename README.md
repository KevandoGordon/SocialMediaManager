# Social Connect

A workspace-based social media manager for agencies and in-house teams: plan, preview, schedule, approve and track content across Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Pinterest and Threads. Next.js (App Router) + TypeScript + Tailwind CSS.

```bash
npm install
cp .env.example .env.local   # add keys for the networks you want to connect
npm run dev                  # http://localhost:3000, then create an account
```

## How it runs today

This is the **local-only** stage:

- **Accounts.** Email and password, with passwords hashed (scrypt). Sessions are an httpOnly cookie, and the server stores only a hash of the session token.
- **Data.** Saved to `.data/store.json`, with uploads in `.data/uploads/`. The folder is git-ignored. Delete it to start over.
- **Social networks.** Connected with each network's real OAuth flow; setup is in [docs/connecting-networks.md](docs/connecting-networks.md). Tokens are encrypted and stay on the server.
- **Not yet built:**
  - Publishing scheduled posts to the networks.
  - Syncing analytics, comments and mentions from them.
  - Sending email (invitations appear in-app for the invitee's email).
  - Billing (plan switches are free and instant).

[docs/production-architecture.md](docs/production-architecture.md) covers moving to a hosted database.

## Workspaces in one minute

- A **user** is one account. A **workspace** is an independent environment (agency, brand, client) with its own posts, accounts, media, inbox, analytics, settings and members.
- **Roles are per workspace** (Admin, Manager, Editor, Viewer). The same person can be Admin in one workspace and Viewer in another.
- **Ownership is separate from membership.** Each workspace has one owner, who is always an Admin. An account can join any number of workspaces by invitation; how many it can own depends on its plan.
- **Plans are per owner account, not per seat:**
  - Free: own 1 workspace, 30 days of analytics.
  - Pro ($29/month): own 5, 12 months of analytics, CSV export.
  - Agency ($99/month): own 25.
  
  A workspace's features come from its owner's plan.

## Tests

```bash
npm test
```

This runs the API rules against sample data in [tests/fixtures/](tests/fixtures/):
- isolation between workspaces
- roles, plans and limits
- invitations
- connection steps
- file access

The sample data is only used by tests; the app itself starts empty. To try the app with the sample data, write it to a separate file and point the server at it:

```bash
DATA_FILE=/tmp/sc-sample.json npx tsx tests/seed-fixtures.mts
DATA_FILE=/tmp/sc-sample.json npm run dev
```

Every sample user, e.g. `jordan@kestrelstudio.example`, signs in with `fixture-password`.

## Where things are

| Path | What |
|---|---|
| `lib/data/api.ts` | **The API.** Runs on the server. It checks the session, workspace membership and permissions on every call, and scopes every record by workspace. |
| `app/api/rpc/route.ts`, `lib/server/rpc.ts` | How the browser calls the API: an allowlist of functions, run as the session's user, with a same-origin check. |
| `lib/data/client.ts`, `lib/data/store.tsx` | Browser side: typed calls to the API, plus the store with session, workspace list and the active workspace's data. |
| `lib/server/` | Persistence (`state.ts`), sessions, password hashing and token encryption, uploads, and OAuth settings per network (`oauth/providers.ts`). |
| `app/api/connect/` | The OAuth start and callback routes. |
| `app/(auth)/` | Sign-in and sign-up. |
| `lib/permissions.ts` | The only place roles are mapped to permissions. Used by both the API and the UI. |
| `lib/plans.ts` | Plans and prices. |
| `tests/` | API tests, sample data, and the seeding script. |
