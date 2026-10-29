"use client";

import Link from "next/link";
import { format, formatDistanceToNow, isAfter, subDays } from "date-fns";
import { CalendarClock, CheckCircle2, Circle, Inbox, TrendingUp } from "lucide-react";
import { MediaThumb } from "@/components/media-thumb";
import { NetworkIcon } from "@/components/network-badge";
import { PostSummary } from "@/components/post-summary";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { useCan, useStore } from "@/lib/data/store";
import { NETWORKS } from "@/lib/networks";
import { compact, percent } from "@/lib/utils";

const SENTIMENT_TONE = { positive: "success", neutral: "neutral", negative: "danger" } as const;

export default function DashboardPage() {
  const { posts, inbox, mentions, daily, accounts, media, members, currentUser, activeWorkspace } = useStore();
  const can = useCan();
  const now = new Date();

  const upcoming = posts
    .filter((p) => p.scheduledAt && isAfter(new Date(p.scheduledAt), now) && p.status !== "draft")
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const pending = posts.filter((p) => p.status === "pending");
  const openInbox = inbox.filter((i) => i.status === "open");
  const unread = openInbox.filter((i) => !i.read).length;

  const split = format(subDays(now, 14), "yyyy-MM-dd");
  const prevSplit = format(subDays(now, 28), "yyyy-MM-dd");
  const sum = (rows: typeof daily, key: "impressions" | "engagements") => rows.reduce((s, r) => s + r[key], 0);
  const recent = daily.filter((d) => d.date > split);
  const previous = daily.filter((d) => d.date > prevSplit && d.date <= split);
  const impressions = sum(recent, "impressions");
  const prevImpressions = sum(previous, "impressions");
  const rate = impressions ? sum(recent, "engagements") / impressions : 0;
  const prevRate = prevImpressions ? sum(previous, "engagements") / prevImpressions : 0;
  const followers = accounts.filter((a) => a.connected).reduce((s, a) => s + (a.followers ?? 0), 0);

  const thisWeek = upcoming.filter((p) => new Date(p.scheduledAt!) < subDays(now, -7)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"}, ${currentUser?.name.split(" ")[0] ?? ""}`}
        description={`Here's what's happening in ${activeWorkspace!.workspace.name}.`}
      />

      {posts.length === 0 && (
        <GettingStarted
          steps={[
            { done: accounts.some((a) => a.connected), label: "Connect a social account", href: "/accounts", allowed: can("accounts.manage") },
            { done: members.length > 1, label: "Invite your team", href: "/team", allowed: can("members.invite") },
            { done: posts.length > 0, label: "Write your first post", href: "/compose", allowed: can("posts.create") },
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Scheduled this week" value={thisWeek} hint={`${upcoming.length} upcoming total`} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Pending approvals" value={pending.length} hint="awaiting review" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Impressions (14d)" value={compact(impressions)} delta={prevImpressions ? impressions / prevImpressions - 1 : undefined} hint="vs. prior 14d" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Engagement rate" value={percent(rate)} delta={prevRate ? rate / prevRate - 1 : undefined} hint={`${compact(followers)} followers`} icon={<Inbox className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Upcoming posts"
            description="Next scheduled and in-review content"
            action={<Link href="/calendar" className={buttonClass({ variant: "outline", size: "sm" })}>Open calendar</Link>}
          />
          {upcoming.length ? (
            <ul className="divide-y divide-border">
              {upcoming.slice(0, 6).map((p) => (
                <li key={p.id} className="px-4 py-3 sm:px-5">
                  <PostSummary post={p} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing scheduled" description="Compose a post and drag it onto the calendar." />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Pending approvals"
            description={can("posts.approve") ? "Waiting on you or your managers" : "Waiting on a Manager or Admin"}
            action={<Link href="/approvals" className={buttonClass({ variant: "outline", size: "sm" })}>Review</Link>}
          />
          {pending.length ? (
            <ul className="divide-y divide-border">
              {pending.map((p) => (
                <li key={p.id} className="px-4 py-3 sm:px-5">
                  <PostSummary post={p} showStatus={false} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="All caught up" />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Inbox"
            description={`${openInbox.length} open · ${unread} unread`}
            action={<Link href="/inbox" className={buttonClass({ variant: "outline", size: "sm" })}>Open</Link>}
          />
          <ul className="divide-y divide-border">
            {openInbox.slice(0, 4).map((i) => (
              <li key={i.id} className="flex gap-3 px-4 py-3 sm:px-5">
                <NetworkIcon network={i.network} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {i.from.name}
                    {!i.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />}
                  </p>
                  <p className="truncate text-sm text-muted">{i.body}</p>
                </div>
                <span className="text-xs whitespace-nowrap text-muted">{formatDistanceToNow(new Date(i.receivedAt))}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Recent mentions"
            action={<Link href="/mentions" className={buttonClass({ variant: "outline", size: "sm" })}>All</Link>}
          />
          <ul className="divide-y divide-border">
            {mentions.slice(0, 4).map((m) => (
              <li key={m.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-xs">
                  <NetworkIcon network={m.network} size={16} />
                  <span className="font-medium">{m.author}</span>
                  <Badge tone={SENTIMENT_TONE[m.sentiment]} className="ml-auto capitalize">{m.sentiment}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{m.body}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Followers by network" />
          <CardBody className="space-y-3">
            {[...accounts].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)).map((a) => {
              const max = Math.max(1, ...accounts.map((x) => x.followers ?? 0));
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <NetworkIcon network={a.network} size={20} />
                  <span className="w-20 shrink-0 truncate">{NETWORKS[a.network].name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${((a.followers ?? 0) / max) * 100}%`, opacity: a.connected ? 1 : 0.35 }} />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-muted">{a.followers === null ? "—" : compact(a.followers)}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {media.length > 0 && (
        <Card>
          <CardHeader
            title="Recently added media"
            action={<Link href="/media" className={buttonClass({ variant: "outline", size: "sm" })}>Library</Link>}
          />
          <CardBody className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[...media].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((m) => (
              <MediaThumb key={m.id} item={m} aspect={1} className="rounded-lg" />
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function GettingStarted({ steps }: { steps: { done: boolean; label: string; href: string; allowed: boolean }[] }) {
  return (
    <Card>
      <CardHeader title="Get started" description="A new workspace starts empty. These steps set it up." />
      <ul className="divide-y divide-border">
        {steps.map((s) => (
          <li key={s.href} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            {s.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted" />}
            <span className={s.done ? "flex-1 text-sm text-muted line-through" : "flex-1 text-sm"}>{s.label}</span>
            {!s.done &&
              (s.allowed ? (
                <Link href={s.href} className={buttonClass({ variant: "outline", size: "sm" })}>Start</Link>
              ) : (
                <span className="text-xs text-muted">Needs a higher role</span>
              ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}
