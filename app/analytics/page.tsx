"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO, subDays } from "date-fns";
import { Download, MousePointerClick, Eye, Heart, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { NetworkIcon, NetworkStack } from "@/components/network-badge";
import { StatCard } from "@/components/stat-card";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { NETWORKS, NETWORK_IDS } from "@/lib/networks";
import type { NetworkId, Post, PostMetrics } from "@/lib/types";
import { compact, percent } from "@/lib/utils";

type Metric = "impressions" | "engagements" | "clicks" | "followers";
const METRICS: { value: Metric; label: string }[] = [
  { value: "impressions", label: "Impressions" },
  { value: "engagements", label: "Engagements" },
  { value: "clicks", label: "Clicks" },
  { value: "followers", label: "Followers" },
];

const MIX = [
  { key: "likes", label: "Likes", color: "var(--series-1)" },
  { key: "comments", label: "Comments", color: "var(--series-2)" },
  { key: "shares", label: "Shares", color: "var(--series-3)" },
  { key: "clicks", label: "Clicks", color: "var(--series-4)" },
] as const;

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label, labelFormat }: TooltipProps<number, string> & { labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{labelFormat ? labelFormat(String(label)) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey as string} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">{Number(p.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { daily, postMetrics, posts, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const [range, setRange] = useState<"7" | "14" | "30">("30");
  const [network, setNetwork] = useState<NetworkId | "all">("all");
  const [metric, setMetric] = useState<Metric>("impressions");
  const [mixAsTable, setMixAsTable] = useState(false);
  const [openPost, setOpenPost] = useState<string | null>(null);

  const days = Number(range);
  const start = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
  const prevStart = format(subDays(new Date(), days * 2 - 1), "yyyy-MM-dd");
  const inNetwork = (n: NetworkId) => network === "all" || n === network;
  const rows = daily.filter((d) => d.date >= start && inNetwork(d.network));
  const prevRows = daily.filter((d) => d.date >= prevStart && d.date < start && inNetwork(d.network));

  const total = (list: typeof rows, key: "impressions" | "engagements" | "clicks") => list.reduce((s, r) => s + r[key], 0);
  const followersAt = (date: string) => daily.filter((d) => d.date === date && inNetwork(d.network)).reduce((s, r) => s + r.followers, 0);
  const lastDate = rows.at(-1)?.date ?? start;
  const followerGain = followersAt(lastDate) - followersAt(start);

  const seriesMap = new Map<string, number>();
  for (const r of rows) seriesMap.set(r.date, (seriesMap.get(r.date) ?? 0) + r[metric]);
  const series = [...seriesMap].map(([date, value]) => ({ date, value }));

  const byNetwork = NETWORK_IDS.filter(inNetwork)
    .map((n) => {
      const list = rows.filter((r) => r.network === n);
      return {
        network: n,
        name: NETWORKS[n].name,
        value: metric === "followers" ? list.at(-1)?.followers ?? 0 : list.reduce((s, r) => s + r[metric], 0),
      };
    })
    .sort((a, b) => b.value - a.value);

  const mix = NETWORK_IDS.filter(inNetwork).map((n) => {
    const list = postMetrics.filter((m) => m.network === n);
    return {
      name: NETWORKS[n].name,
      likes: list.reduce((s, m) => s + m.likes, 0),
      comments: list.reduce((s, m) => s + m.comments, 0),
      shares: list.reduce((s, m) => s + m.shares, 0),
      clicks: list.reduce((s, m) => s + m.clicks, 0),
    };
  }).filter((r) => r.likes + r.comments + r.shares + r.clicks > 0);

  const topPosts = posts
    .filter((p) => p.status === "published")
    .map((p) => {
      const m = postMetrics.filter((x) => x.postId === p.id && inNetwork(x.network));
      const impressions = m.reduce((s, x) => s + x.impressions, 0);
      const engagements = m.reduce((s, x) => s + x.likes + x.comments + x.shares, 0);
      return { post: p, metrics: m, impressions, engagements, clicks: m.reduce((s, x) => s + x.clicks, 0) };
    })
    .filter((r) => r.metrics.length)
    .sort((a, b) => b.impressions - a.impressions);

  async function exportCsv() {
    // The API re-checks analytics.export for the caller's real role before returning anything.
    const csv = await actions.exportAnalyticsCsv({ since: start, network });
    if (csv === undefined) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `analytics-${network}-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Report exported");
  }

  const impressions = total(rows, "impressions");
  const engagements = total(rows, "engagements");
  const prevImp = total(prevRows, "impressions");
  const prevEng = total(prevRows, "engagements");
  const selected = topPosts.find((r) => r.post.id === openPost);

  if (daily.length === 0) {
    return (
      <div>
        <PageHeader title="Analytics" description="Performance across networks and posts." />
        <Card>
          <EmptyState
            title="No analytics yet"
            description="Analytics appear once this workspace has connected accounts with activity."
            action={<Link href="/accounts" className={buttonClass({ variant: "outline" })}>Go to accounts</Link>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Performance across networks and posts."
        actions={
          can("analytics.export") ? (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          ) : (
            <Button variant="outline" disabled title="Managers and Admins can export reports">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={range}
          onChange={setRange}
          items={[
            { value: "7", label: "7 days" },
            { value: "14", label: "14 days" },
            { value: "30", label: "30 days" },
          ]}
        />
        <Select aria-label="Network" value={network} onChange={(e) => setNetwork(e.target.value as NetworkId | "all")} className="w-auto">
          <option value="all">All networks</option>
          {NETWORK_IDS.map((n) => (
            <option key={n} value={n}>{NETWORKS[n].name}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Impressions" value={compact(impressions)} delta={prevImp ? impressions / prevImp - 1 : undefined} hint={`vs. prior ${days}d`} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Engagements" value={compact(engagements)} delta={prevEng ? engagements / prevEng - 1 : undefined} hint={`${percent(engagements / impressions)} rate`} icon={<Heart className="h-4 w-4" />} />
        <StatCard label="Link clicks" value={compact(total(rows, "clicks"))} hint={`${percent(total(rows, "clicks") / impressions, 2)} CTR`} icon={<MousePointerClick className="h-4 w-4" />} />
        <StatCard label="Follower growth" value={`${followerGain >= 0 ? "+" : ""}${compact(followerGain)}`} hint={`${compact(followersAt(lastDate))} total`} icon={<Users className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader
          title={`${METRICS.find((m) => m.value === metric)!.label} over time`}
          description={network === "all" ? "All networks combined" : NETWORKS[network].name}
          action={<Tabs value={metric} onChange={setMetric} items={METRICS} className="hidden sm:block" />}
        />
        <CardBody>
          <Tabs value={metric} onChange={setMetric} items={METRICS} className="mb-4 sm:hidden" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fill-1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" {...axis} tickFormatter={(d) => format(parseISO(d), "d MMM")} minTickGap={24} />
                <YAxis {...axis} tickFormatter={(v) => compact(v)} width={48} domain={metric === "followers" ? ["auto", "auto"] : [0, "auto"]} />
                <Tooltip
                  content={<ChartTooltip labelFormat={(d) => format(parseISO(d), "EEE d MMM")} />}
                  cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={METRICS.find((m) => m.value === metric)!.label}
                  stroke="var(--series-1)"
                  strokeWidth={2}
                  fill="url(#fill-1)"
                  activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`${METRICS.find((m) => m.value === metric)!.label} by network`} description={metric === "followers" ? "Current total" : `Last ${days} days`} />
          <CardBody>
            <ul className="space-y-2.5">
              {byNetwork.map((r) => (
                <li key={r.network} className="group flex items-center gap-3 text-sm" title={`${r.name}: ${r.value.toLocaleString()}`}>
                  <NetworkIcon network={r.network} size={20} decorative />
                  <span className="w-20 shrink-0 truncate">{r.name}</span>
                  <div className="h-3 flex-1">
                    <div
                      className="h-full rounded-r-[4px] bg-[var(--series-1)] transition-opacity group-hover:opacity-80"
                      style={{ width: `${(r.value / (byNetwork[0]?.value || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-xs text-muted tabular-nums">{compact(r.value)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Engagement mix"
            description="Published posts, by network"
            action={
              <Button variant="ghost" size="sm" onClick={() => setMixAsTable((v) => !v)}>
                {mixAsTable ? "Show chart" : "Show table"}
              </Button>
            }
          />
          <CardBody>
            {mixAsTable ? (
              <MixTable rows={mix} />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {MIX.map((m) => (
                    <span key={m.key} className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                      {m.label}
                    </span>
                  ))}
                </div>
                <div style={{ height: Math.max(160, mix.length * 36) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mix} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={8}>
                      <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
                      <XAxis type="number" {...axis} tickFormatter={(v) => compact(v)} />
                      <YAxis type="category" dataKey="name" {...axis} width={72} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                      {MIX.map((m, i) => (
                        <Bar
                          key={m.key}
                          dataKey={m.key}
                          name={m.label}
                          stackId="mix"
                          fill={m.color}
                          stroke="var(--surface)"
                          strokeWidth={2}
                          radius={i === MIX.length - 1 ? [0, 4, 4, 0] : 0}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Post performance" description="Published posts · select one for a per-network breakdown" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Post</th>
                <th className="px-3 py-2.5 font-medium">Networks</th>
                <th className="px-3 py-2.5 text-right font-medium">Impressions</th>
                <th className="px-3 py-2.5 text-right font-medium">Engagements</th>
                <th className="px-3 py-2.5 text-right font-medium">Eng. rate</th>
                <th className="px-5 py-2.5 text-right font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topPosts.map((r) => (
                <tr key={r.post.id} onClick={() => setOpenPost(r.post.id)} className="cursor-pointer hover:bg-surface-2">
                  <td className="max-w-xs px-5 py-3">
                    <button type="button" className="line-clamp-1 text-left hover:underline">{r.post.content}</button>
                    <span className="text-xs text-muted">{format(new Date(r.post.scheduledAt!), "d MMM")}</span>
                  </td>
                  <td className="px-3 py-3"><NetworkStack networks={r.metrics.map((m) => m.network)} /></td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.engagements.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{percent(r.engagements / r.impressions)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topPosts.length === 0 && <p className="py-8 text-center text-sm text-muted">No published posts on this network yet.</p>}
        </div>
      </Card>

      {selected && <PostBreakdown post={selected.post} metrics={selected.metrics} onClose={() => setOpenPost(null)} />}
    </div>
  );
}

function MixTable({ rows }: { rows: { name: string; likes: number; comments: number; shares: number; clicks: number }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="py-2 font-medium">Network</th>
            {MIX.map((m) => <th key={m.key} className="py-2 text-right font-medium">{m.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="py-2">{r.name}</td>
              {MIX.map((m) => <td key={m.key} className="py-2 text-right tabular-nums">{r[m.key].toLocaleString()}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostBreakdown({ post, metrics, onClose }: { post: Post; metrics: PostMetrics[]; onClose: () => void }) {
  const data = metrics.map((m) => ({ name: NETWORKS[m.network].name, impressions: m.impressions, engagements: m.likes + m.comments + m.shares }));
  return (
    <Dialog open onClose={onClose} title="Post breakdown" className="sm:max-w-xl">
      <p className="mb-4 line-clamp-3 text-sm text-muted">{post.content}</p>
      <p className="mb-2 text-xs font-medium">Impressions by network</p>
      <div style={{ height: Math.max(120, data.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" {...axis} width={72} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="impressions" name="Impressions" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={16} label={{ position: "right", fill: "var(--muted)", fontSize: 11, formatter: (v: number) => compact(v) }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="py-2 font-medium">Network</th>
            <th className="py-2 text-right font-medium">Likes</th>
            <th className="py-2 text-right font-medium">Comments</th>
            <th className="py-2 text-right font-medium">Shares</th>
            <th className="py-2 text-right font-medium">Clicks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {metrics.map((m) => (
            <tr key={m.network}>
              <td className="py-2"><span className="inline-flex items-center gap-2"><NetworkIcon network={m.network} size={16} decorative />{NETWORKS[m.network].name}</span></td>
              <td className="py-2 text-right tabular-nums">{m.likes.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums">{m.comments.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums">{m.shares.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums">{m.clicks.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
