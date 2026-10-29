# Social Connect: production architecture and migration plan

Status: proposal. Nothing here has been provisioned. Per the approval gate, choosing and configuring a database, auth provider, email provider, storage, job runner, social network APIs or billing needs sign-off first. The app currently runs on the mock API in `lib/data/api.ts`.

## 1. Concepts

Three separate concepts, each stored in its own place:

| Concept | Answers | Stored in |
|---|---|---|
| **Ownership** | Who is accountable for this workspace, and whose plan does it count against? | `workspaces.owner_user_id` (exactly one) |
| **Membership** | Who can access this workspace, and with what role? | `workspace_memberships` (one row per user per workspace) |
| **Entitlement** | How many workspaces may this account own? | `account_entitlements` → `plans` |

- The workspace creation limit is checked as *count of workspaces where `owner_user_id = me`* against *my plan's `workspace_creation_limit`*. Memberships are never counted.
- The owner is always also an Admin member. Ownership can only be transferred by the owner, to an existing Admin whose own plan has room.
- Roles live only on memberships. A user has no global role.

## 2. Schema (PostgreSQL)

Conventions:
- Every workspace-owned table has a non-null `workspace_id`.
- Parents expose `UNIQUE (workspace_id, id)`. Children reference them with composite foreign keys `(workspace_id, x_id)`, so the database itself rejects a row that points at another workspace's record.
- `citext` is used for emails.

```sql
-- Accounts --------------------------------------------------------------
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,          -- verified by the auth provider
  name          text   not null,
  title         text   not null default '',
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create table plans (
  id                        text primary key,    -- 'free' only, until pricing is decided
  name                      text not null,
  workspace_creation_limit  int  not null check (workspace_creation_limit >= 0)
);
insert into plans values ('free', 'Free', 1);

-- The billing/entitlement record the creation limit is checked against. One per account today;
-- a future org/billing entity can replace user_id without touching memberships.
create table account_entitlements (
  user_id     uuid primary key references users(id) on delete cascade,
  plan_id     text not null references plans(id) default 'free',
  updated_at  timestamptz not null default now()
);

create table user_notification_prefs (
  user_id              uuid primary key references users(id) on delete cascade,
  approval_requests    boolean not null default true,
  approval_decisions   boolean not null default true,
  new_messages         boolean not null default true,
  negative_mentions    boolean not null default true,
  weekly_report        boolean not null default false,
  channel              text not null default 'both' check (channel in ('email','push','both'))
);

-- Workspaces, membership, invitations -----------------------------------
create type workspace_role as enum ('Admin', 'Manager', 'Editor', 'Viewer');

create table workspaces (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 50),
  color          text not null,
  owner_user_id  uuid not null references users(id),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on workspaces (owner_user_id) where deleted_at is null;

create table workspace_memberships (
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  role          workspace_role not null,
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on workspace_memberships (user_id);

create type invitation_status as enum ('pending', 'accepted', 'declined', 'revoked', 'expired');

create table workspace_invitations (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  email               citext not null,
  role                workspace_role not null,
  invited_by_user_id  uuid references users(id) on delete set null,
  token_hash          bytea not null unique,      -- sha256 of the link token; the raw token is only ever emailed
  status              invitation_status not null default 'pending',
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now(),
  last_sent_at        timestamptz not null default now(),
  send_count          int not null default 1,
  responded_at        timestamptz,
  accepted_by_user_id uuid references users(id)
);
-- At most one open invitation per email per workspace.
create unique index one_pending_invite on workspace_invitations (workspace_id, email) where status = 'pending';

create table workspace_settings (
  workspace_id      uuid primary key references workspaces(id) on delete cascade,
  timezone          text not null default 'UTC',
  week_starts_on    smallint not null default 1 check (week_starts_on in (0, 1)),
  require_approval  boolean not null default true,
  default_networks  text[] not null default '{}'
);

-- Social accounts -------------------------------------------------------
create type network as enum ('facebook','instagram','x','linkedin','tiktok','youtube','pinterest','threads');

create table social_accounts (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  network              network not null,
  external_account_id  text not null,
  display_name         text not null,
  handle               text not null,
  status               text not null check (status in ('connected','disconnected','needs_reauth')),
  followers_count      int not null default 0,
  last_synced_at       timestamptz,
  connected_by_user_id uuid references users(id) on delete set null,
  unique (workspace_id, id),
  unique (workspace_id, network, external_account_id)
);

-- Tokens are kept apart, encrypted (KMS envelope), and only read by the sync/publish workers.
create table social_account_credentials (
  social_account_id  uuid primary key references social_accounts(id) on delete cascade,
  access_token_enc   bytea not null,
  refresh_token_enc  bytea,
  scopes             text[] not null,
  expires_at         timestamptz
);

-- Media -----------------------------------------------------------------
create table media_assets (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  uploaded_by   uuid references users(id) on delete set null,
  storage_key   text not null unique,       -- object storage path, served via short-lived signed URLs
  kind          text not null check (kind in ('image','video')),
  mime_type     text not null,
  width         int, height int, duration_ms int,
  size_bytes    bigint not null,
  name          text not null,
  created_at    timestamptz not null default now(),
  unique (workspace_id, id)
);
create table media_tags (
  workspace_id    uuid not null,
  media_asset_id  uuid not null,
  tag             text not null,
  primary key (media_asset_id, tag),
  foreign key (workspace_id, media_asset_id) references media_assets(workspace_id, id) on delete cascade
);

-- Posts, approvals, publishing ------------------------------------------
create type post_status as enum ('draft','pending','changes_requested','scheduled','published');

create table posts (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  author_user_id  uuid references users(id) on delete set null,   -- posts outlive their author's membership
  content         text not null,
  campaign        text,
  status          post_status not null default 'draft',
  scheduled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, id),
  check (status in ('draft','changes_requested') or scheduled_at is not null)
);
create index on posts (workspace_id, scheduled_at);

-- One row per network the post goes to. Replaces Post.networks in the mock.
create table post_targets (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null,
  post_id            uuid not null,
  social_account_id  uuid not null,
  status             text not null default 'queued' check (status in ('queued','publishing','published','failed')),
  external_post_id   text,
  published_at       timestamptz,
  last_error         text,
  unique (workspace_id, id),
  unique (post_id, social_account_id),
  foreign key (workspace_id, post_id) references posts(workspace_id, id) on delete cascade,
  foreign key (workspace_id, social_account_id) references social_accounts(workspace_id, id)
);

create table post_media (
  workspace_id    uuid not null,
  post_id         uuid not null,
  media_asset_id  uuid not null,
  position        smallint not null,
  primary key (post_id, position),
  foreign key (workspace_id, post_id) references posts(workspace_id, id) on delete cascade,
  foreign key (workspace_id, media_asset_id) references media_assets(workspace_id, id)
);

create table post_comments (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null,
  post_id         uuid not null,
  author_user_id  uuid references users(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now(),
  foreign key (workspace_id, post_id) references posts(workspace_id, id) on delete cascade
);

-- Audit trail of the approval state machine (the mock only keeps the current status).
create table approval_events (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null,
  post_id        uuid not null,
  actor_user_id  uuid references users(id) on delete set null,
  action         text not null check (action in ('submitted','approved','changes_requested','revoked')),
  comment_id     uuid references post_comments(id),
  created_at     timestamptz not null default now(),
  foreign key (workspace_id, post_id) references posts(workspace_id, id) on delete cascade
);

create table publish_jobs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null,
  post_target_id  uuid not null,
  run_at          timestamptz not null,
  status          text not null default 'waiting' check (status in ('waiting','running','done','failed','cancelled')),
  attempts        int not null default 0,
  locked_until    timestamptz,
  last_error      text,
  foreign key (workspace_id, post_target_id) references post_targets(workspace_id, id) on delete cascade
);
create index on publish_jobs (run_at) where status = 'waiting';

-- Inbox -----------------------------------------------------------------
create table conversations (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null,
  social_account_id   uuid not null,
  kind                text not null check (kind in ('comment','dm')),
  external_thread_id  text not null,
  post_id             uuid,
  participant_name    text not null,
  participant_handle  text not null,
  status              text not null default 'open' check (status in ('open','done')),
  assignee_user_id    uuid,
  last_message_at     timestamptz not null,
  unique (workspace_id, id),
  unique (social_account_id, external_thread_id),
  foreign key (workspace_id, social_account_id) references social_accounts(workspace_id, id),
  foreign key (workspace_id, post_id) references posts(workspace_id, id) on delete set null (post_id),
  -- Assignee must be a current member of the same workspace; unassigned automatically on removal (PG 15+).
  foreign key (workspace_id, assignee_user_id) references workspace_memberships(workspace_id, user_id) on delete set null (assignee_user_id)
);

create table conversation_messages (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null,
  conversation_id  uuid not null,
  direction        text not null check (direction in ('inbound','outbound')),
  author_user_id   uuid references users(id) on delete set null,   -- set for outbound replies
  body             text not null,
  external_id      text,
  created_at       timestamptz not null default now(),
  foreign key (workspace_id, conversation_id) references conversations(workspace_id, id) on delete cascade
);

-- Read state is per user (the mock keeps one flag per conversation).
create table conversation_reads (
  conversation_id  uuid not null references conversations(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Mentions and analytics ------------------------------------------------
create table mentions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  network       network not null,
  external_id   text not null,
  author        text not null, handle text not null, body text not null,
  sentiment     text not null check (sentiment in ('positive','neutral','negative')),
  reach         int not null default 0,
  created_at    timestamptz not null,
  unique (workspace_id, network, external_id)
);

create table analytics_daily (
  workspace_id       uuid not null,
  social_account_id  uuid not null,
  date               date not null,
  followers          int not null, impressions int not null, engagements int not null, clicks int not null,
  primary key (social_account_id, date),
  foreign key (workspace_id, social_account_id) references social_accounts(workspace_id, id) on delete cascade
);

create table post_target_metrics (
  post_target_id  uuid primary key,
  workspace_id    uuid not null,
  impressions int not null, likes int not null, comments int not null, shares int not null, clicks int not null,
  captured_at     timestamptz not null,
  foreign key (workspace_id, post_target_id) references post_targets(workspace_id, id) on delete cascade
);
```

### Invariants the schema can't express alone

These run in the same transaction as the write. A deferred constraint trigger on `workspace_memberships` and `workspaces` re-checks them at commit as a backstop.

1. Every workspace has at least one `Admin` membership.
2. The owner has an `Admin` membership in their workspace.
3. An owner can't leave or be removed; ownership must be transferred first.

## 3. Enforcing the free-tier limit under concurrency

The limit is checked against the **owner's entitlement row**, which is locked so concurrent requests from the same account queue behind each other:

```sql
begin;
  -- Serializes all workspace creations (and ownership transfers *to* this user) for one account.
  select p.workspace_creation_limit
    from account_entitlements e join plans p on p.id = e.plan_id
   where e.user_id = $owner
   for update of e;

  select count(*) from workspaces where owner_user_id = $owner and deleted_at is null;
  -- if count >= limit: rollback and return 409 limit_reached

  insert into workspaces (...) values (...) returning id;
  insert into workspace_memberships (workspace_id, user_id, role) values ($id, $owner, 'Admin');
  insert into workspace_settings (workspace_id) values ($id);
commit;
```

`transferOwnership` takes the same lock on the **recipient's** entitlement row. The UI's disabled button is only a hint; the server is the authority. The mock gets the same guarantee by doing its check and insert in one synchronous step, and the test suite fires two concurrent creates to confirm.

**Decision to confirm:** the limit counts workspaces an account *currently owns*. Transferring a workspace away frees a slot. If you'd rather cap "workspaces ever created" (to stop a create → transfer → create loop), add a `created_by_user_id` column and count that instead.

## 4. Authorization on the server

Every request goes through one helper:

```ts
// Server-side, per request
const { user, membership } = await authorize(session, workspaceId, "posts.approve");
// 1. session → user (from the auth provider; never from the request body)
// 2. membership = select role from workspace_memberships where workspace_id = $1 and user_id = $2
//    missing → 404 (don't confirm the workspace exists)
// 3. can(membership.role, permission) from lib/permissions.ts → else 403
```

- Records are always fetched with `where workspace_id = $ws and id = $id`. An ID from another workspace returns 404.
- Resource rules (`canEditPost`, `canDeletePost`, `assignableRoles`) come from the same `lib/permissions.ts` the UI uses, so the two can't drift apart.
- **Defence in depth:** Postgres row-level security on every workspace table, using a policy such as `workspace_id in (select workspace_id from workspace_memberships where user_id = current_setting('app.user_id')::uuid)`. Set `app.user_id` per transaction. A query bug then still can't read across workspaces.
- **Recommended:** put the workspace in the URL (`/w/[workspaceId]/calendar`) so links are shareable and bookmarkable. The server still verifies membership on every request; the URL is only a request, never proof.

## 5. Invitations in production

- Creating an invitation stores a random token's hash and emails a link `/invite/<token>` (email provider needed; approval gate).
- The accept page requires sign-in. It accepts only if the signed-in user's **verified** email equals the invitation email (case-insensitive), the status is `pending`, and `expires_at > now()`. Then it inserts the membership and marks the invitation `accepted`, in one transaction.
- **Unknown email:** the link leads to sign-up, pre-filling the email. After the email is verified, the invitation can be accepted. Pending invitations for an email also show on the Workspaces page for any signed-in account with that verified email (as in the mock).
- Expiry is computed at read time. A periodic job may set `status = 'expired'` for reporting, but correctness never depends on that job running.
- Escalation: the inviter can only grant roles in `assignableRoles(inviterRole)` (Admin: any; Manager: Editor or Viewer). This is checked again on resend and revoke.

## 6. Migration plan from the mock

The mock API was shaped so each step swaps an implementation without touching pages.

1. **Decide providers** *(needs your approval)*: Postgres host, auth provider, transactional email, object storage, job runner. Billing is deferred.
2. **Server boundary.** Move `lib/data/api.ts` behind Next.js route handlers or server actions with identical function signatures. Keep the in-memory implementation as a `DATA_SOURCE=mock` adapter for local development and demos, and keep the demo sign-in menu only in that mode.
3. **Auth.** Replace `demoSignIn` with the provider's session. `requireUser()` becomes "read the session cookie".
4. **Schema and seed.** Apply section 2 as migrations. Write a seed script that loads `lib/mock/*` into a dev database, so the demo data survives the switch.
5. **Repositories.** Implement each API function against Postgres using `authorize()` and `lib/permissions.ts`. Port the existing API test suite (53 cases: isolation, roles, limit, invitations, safeguards) to run against **both** adapters in CI.
6. **Invitations.** Add tokens, email sending, the accept route and the sign-up path from section 5.
7. **Media.** Upload directly to object storage through pre-signed URLs; store metadata in `media_assets`.
8. **Social networks** *(per network; needs approval)*: OAuth connect into `social_account_credentials`; sync workers for analytics, mentions and inbox; `publish_jobs` worker for scheduled posts.
9. **Billing** *(later; needs pricing decisions)*: add rows to `plans`, attach a billing provider to `account_entitlements`. Memberships are untouched.

## 7. Differences between the mock and this schema

| Mock | Production |
|---|---|
| `Post.networks: NetworkId[]` | `post_targets` rows pointing at specific connected accounts |
| `InboxItem.read` per conversation | `conversation_reads` per user |
| `InboxItem.replies` inline | `conversation_messages` |
| Approval status only | `approval_events` audit trail |
| Expiry derived on read | Same, plus optional reporting job |
| Uploaded media as browser object URLs | Object storage + signed URLs |
| Data resets on reload | Durable |
