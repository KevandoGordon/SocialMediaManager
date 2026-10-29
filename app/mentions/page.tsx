"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Frown, Meh, Search, Smile } from "lucide-react";
import { NetworkIcon } from "@/components/network-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useStore } from "@/lib/data/store";
import { NETWORKS, NETWORK_IDS } from "@/lib/networks";
import type { NetworkId, Sentiment } from "@/lib/types";
import { compact } from "@/lib/utils";

const SENTIMENT = {
  positive: { label: "Positive", tone: "success", icon: Smile, bar: "bg-success" },
  neutral: { label: "Neutral", tone: "neutral", icon: Meh, bar: "bg-muted" },
  negative: { label: "Negative", tone: "danger", icon: Frown, bar: "bg-danger" },
} as const;

export default function MentionsPage() {
  const { mentions } = useStore();
  const [sentiment, setSentiment] = useState<Sentiment | "all">("all");
  const [network, setNetwork] = useState<NetworkId | "all">("all");
  const [sort, setSort] = useState<"recent" | "reach">("recent");
  const [query, setQuery] = useState("");

  const scoped = mentions.filter((m) => network === "all" || m.network === network);
  const counts = { positive: 0, neutral: 0, negative: 0 } as Record<Sentiment, number>;
  for (const m of scoped) counts[m.sentiment]++;
  const totalReach = scoped.reduce((s, m) => s + m.reach, 0);

  const q = query.trim().toLowerCase();
  const list = scoped
    .filter((m) => sentiment === "all" || m.sentiment === sentiment)
    .filter((m) => !q || m.body.toLowerCase().includes(q) || m.author.toLowerCase().includes(q))
    .sort((a, b) => (sort === "reach" ? b.reach - a.reach : b.createdAt.localeCompare(a.createdAt)));

  return (
    <div>
      <PageHeader title="Mentions" description="What people are saying about your brand across networks." />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm">
            <span className="text-2xl font-semibold tabular-nums">{scoped.length}</span>
            <span className="ml-1.5 text-muted">mentions · {compact(totalReach)} potential reach</span>
          </p>
          <p className="text-xs text-muted">Net sentiment {scoped.length ? Math.round(((counts.positive - counts.negative) / scoped.length) * 100) : 0}</p>
        </div>
        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${counts.positive} positive, ${counts.neutral} neutral, ${counts.negative} negative`}>
          {(Object.keys(SENTIMENT) as Sentiment[]).map((s) =>
            counts[s] ? <div key={s} className={SENTIMENT[s].bar} style={{ flex: counts[s] }} /> : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {(Object.keys(SENTIMENT) as Sentiment[]).map((s) => {
            const Icon = SENTIMENT[s].icon;
            return (
              <span key={s} className="inline-flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                {SENTIMENT[s].label} {counts[s]}
              </span>
            );
          })}
        </div>
      </Card>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <Tabs
          value={sentiment}
          onChange={setSentiment}
          items={[
            { value: "all", label: "All", count: scoped.length },
            ...(Object.keys(SENTIMENT) as Sentiment[]).map((s) => ({ value: s, label: SENTIMENT[s].label, count: counts[s] })),
          ]}
        />
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search mentions" className="pl-9" aria-label="Search mentions" />
          </div>
          <Select aria-label="Network" value={network} onChange={(e) => setNetwork(e.target.value as NetworkId | "all")} className="w-auto">
            <option value="all">All networks</option>
            {NETWORK_IDS.map((n) => <option key={n} value={n}>{NETWORKS[n].name}</option>)}
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto">
            <option value="recent">Most recent</option>
            <option value="reach">Highest reach</option>
          </Select>
        </div>
      </div>

      {list.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((m) => {
            const s = SENTIMENT[m.sentiment];
            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-center gap-2.5">
                  <NetworkIcon network={m.network} size={28} className="rounded-full" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium">{m.author}</p>
                    <p className="truncate text-xs text-muted">{m.handle} · {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</p>
                  </div>
                  <Badge tone={s.tone}>
                    <s.icon className="h-3 w-3" />
                    {s.label}
                  </Badge>
                </div>
                <p className="mt-3 text-sm">{m.body}</p>
                <p className="mt-3 text-xs text-muted">{compact(m.reach)} reach · {NETWORKS[m.network].name}</p>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState title="No mentions match" description="Try a different sentiment, network or search." /></Card>
      )}
    </div>
  );
}
