# Social Connect — Workspace-Based SaaS Architecture

The existing Social Connect application is already built with Next.js App Router, TypeScript, and Tailwind CSS. It has 11 pages, a shared application layout, social content composition, a calendar, approvals, inbox, analytics, mentions, media management, accounts, team management, settings, and mock data accessed through `lib/data/api.ts`.

I want to evolve the existing application into a workspace-based SaaS product.

**Do not rebuild the app. Preserve the existing UI, features, routes, and mock-data development workflow wherever possible.**

## 1. Core account and workspace model

A user has one global account and can belong to multiple workspaces.

A workspace is an independent environment for an agency, business, team, or client.

Users can:
- Create a workspace.
- Switch between workspaces.
- Invite other users by email.
- Accept or decline workspace invitations.
- Belong to multiple workspaces simultaneously.
- Have a different role in each workspace.
- Leave a workspace, subject to appropriate ownership safeguards.
- View and manage their profile independently of workspace settings.

Example:
- Workspace A: user is Admin.
- Workspace B: the same user is Editor.
- Workspace C: the same user is Viewer.

These roles must be independent. A role in one workspace must never grant permissions in another.

## 2. Free-tier workspace creation limit

For the initial product model:

- Free users can create a maximum of one workspace.
- Free users can join multiple other workspaces through invitations.
- Joining another workspace does not consume the user's workspace-creation allowance.
- Workspace membership and workspace ownership must be represented separately.
- The free-tier limit must be enforced on the server when a backend is introduced, not just in the UI.
- Concurrent workspace creation must not bypass the limit.
- Do not invent paid-tier limits or pricing without asking me.

Design the model so future subscription plans can support different workspace creation limits without rewriting the membership system.

Do not treat the number of memberships as the number of workspaces a user owns or creates.

## 3. Workspace-specific roles and permissions

Implement roles independently for each workspace.

Initial roles:
- Admin
- Manager
- Editor
- Viewer

Use a centralized permission system.

Suggested starting behavior:
- Admin: full workspace administration.
- Manager: manage content, approvals, accounts, and operational workflows, subject to explicitly defined restrictions.
- Editor: create and edit permitted content, manage drafts, and submit posts for approval.
- Viewer: read-only access to permitted workspace content and analytics.

Define precise permissions for workspace settings, members, invitations, social accounts, posts, approvals, inbox, media, and analytics.

Do not implement authorization as scattered role-name comparisons.

The active workspace determines the membership and permissions used for every workspace-scoped operation.

## 4. Workspace switching and UI

Preserve the existing design and integrate workspace selection into the current sidebar or header.

Include:
- Active workspace name and avatar or icon.
- Workspace switcher.
- Workspace creation action when permitted.
- List of workspaces the user belongs to.
- Clear distinction between owned workspaces and invited memberships where useful.
- Workspace-specific navigation and data.
- Appropriate empty states for new workspaces.

When the active workspace changes, all workspace-dependent pages and data must change consistently, including the dashboard, compose, calendar, approvals, inbox, analytics, mentions, media, accounts, team, and settings.

Prevent data from the previous workspace from remaining visible after switching.

## 5. Invitations and membership management

Add workspace invitation workflows.

An authorized user can:
- Invite someone by email.
- Choose their initial role.
- View pending invitations.
- Resend or revoke invitations when permitted.
- Change a member's role when authorized.
- Remove a member when authorized.

An invited user can:
- View invitations addressed to their account.
- Accept or decline an invitation.
- Join the workspace after accepting.
- Switch into that workspace and receive the assigned role.

Model invitation statuses such as pending, accepted, revoked, and expired.

Prevent duplicate active invitations and unauthorized role escalation.

Define how invitations behave when the invited email does not yet have an account. Do not claim an email was sent when the current implementation is only simulating the operation.

Protect against removing the final workspace administrator or leaving a workspace without a valid owner.

## 6. Data isolation

All workspace-owned data must be scoped to a workspace.

This includes:
- Social accounts and credentials.
- Posts and drafts.
- Scheduled publishing jobs.
- Approval records and comments.
- Inbox conversations and assignments.
- Analytics.
- Brand mentions.
- Media assets.
- Workspace settings.
- Memberships and invitations.

Use explicit workspace relationships in the future database schema.

Every server-side operation must verify that the authenticated user has the required permission for the requested workspace and resource.

Do not trust a workspace ID supplied by the client without verifying membership and authorization.

A user must never access another workspace's data by modifying a URL, request parameter, resource ID, or client-side state.

## 7. Mock-data implementation now

The application currently uses mock data and has no real backend.

First inspect `lib/mock/`, `lib/data/api.ts`, existing types, and the current role switcher.

Implement a coherent mock version of the workspace model while preserving the existing workflows.

Use centralized workspace-aware data-access functions. Avoid importing raw mock datasets directly into page components.

Keep mock persistence behavior explicit. Do not imply invitations were emailed, accounts were connected, or posts were published externally.

Ensure that switching workspaces changes the displayed data and that switching roles changes permissions only within the active workspace.

If real authentication is not implemented, provide clearly labeled demo users or simulated identity behavior rather than implying that the mock role switcher is secure authentication.

## 8. Future backend architecture

Prepare a proposed schema with entities such as:
- users
- workspaces
- workspace_memberships
- workspace_invitations
- workspace_subscriptions or plan entitlements
- social_accounts
- posts
- approvals
- conversations
- media_assets
- analytics records

Adjust the schema to fit the actual application. Avoid redundant ownership fields and ambiguous relationships.

Separate workspace ownership, membership, and subscription entitlement concepts.

The workspace creation limit should be checked against the appropriate owner or billing entity, not against the number of workspaces a user has joined.

## 9. Implementation and verification

Work incrementally:
1. Inspect the existing project.
2. Explain the current architecture and identify the required changes.
3. Update types and mock data for workspaces and memberships.
4. Implement the workspace switcher and workspace creation flow.
5. Implement invitations and membership management.
6. Scope existing application data to the active workspace.
7. Centralize role-based permissions.
8. Test workspace switching, role differences, invitation states, and workspace isolation.
9. Run type checking, linting, production build, and relevant browser tests.

Preserve the existing design and avoid unnecessary rewrites.

## Approval gate

Do not add or configure a database, backend, authentication provider, paid service, social network API, or billing provider without asking me first.

For now, implement the workspace experience using the existing mock-data architecture and provide a recommended production schema and migration plan.

Start by inspecting the repository and continue implementing the mock workspace functionality. Do not stop after producing a plan unless an actual blocker requires my decision.