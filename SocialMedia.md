Build a social media manager web app in Next.js (App Router, TypeScript, Tailwind CSS). It runs entirely on sample data with no backend: put mock data in /lib/mock and access it through a small data layer so a real API can replace it later.

Purpose: marketing agencies and in-house social teams plan, post and track content across 8 networks: Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Pinterest, Threads.

Core flow: write one post, preview how it looks on each network (character limits, image crops, truncation), drag it onto a calendar to schedule it, then send it for approval.

Build these 11 pages with a shared sidebar layout:
1. Dashboard: upcoming posts, pending approvals, key stats
2. Compose: one editor, per-network preview tabs, media picker, schedule button
3. Calendar: month/week views, drag-and-drop rescheduling (use dnd-kit)
4. Approvals: queue with approve / request changes / comments
5. Inbox: shared inbox for comments and DMs from all networks, assign to teammates
6. Analytics: charts per network and per post (use Recharts)
7. Mentions: brand mentions feed with sentiment filters
8. Media library: photo/video grid with tags, search, upload (mock)
9. Accounts: connected social accounts with connect/disconnect (mock)
10. Team: users, roles (Admin, Manager, Editor, Viewer) and permissions; hide or disable actions by role
11. Settings: profile, workspace, notifications

Requirements:
- Light and dark mode with a toggle (next-themes)
- Fully responsive for phone, tablet and desktop; sidebar collapses to a bottom/drawer nav on mobile
- Reusable components (shadcn/ui is fine), consistent design tokens
- A role switcher in the header so I can demo permissions

Work in steps: first scaffold the project, layout, theme and mock data, then build Compose and Calendar, then the remaining pages. Run the dev server and check each page has no console errors before moving on. Ask me before adding any paid service or backend.