import { format } from "date-fns";
import type { Account, DailyMetric, NetworkId, Post, PostMetrics } from "../../lib/types";
import { at, seeded } from "./helpers";

const scale: Record<NetworkId, number> = {
  facebook: 1.4, instagram: 2.2, x: 0.9, linkedin: 0.6, tiktok: 3.1, youtube: 0.8, pinterest: 0.5, threads: 0.4,
};

/** Daily series for each connected account: a year, the longest history any plan shows. */
export function buildDaily(workspaceId: string, accounts: Account[], seed: number, days = 365): DailyMetric[] {
  const rand = seeded(seed);
  const rows: DailyMetric[] = [];
  for (const account of accounts.filter((a) => a.connected && a.workspaceId === workspaceId)) {
    const { network } = account;
    const current = account.followers ?? 0;
    const size = Math.max(0.15, Math.min(2, current / 40_000));
    let followers = Math.round(current * 0.94);
    for (let i = days - 1; i >= 0; i--) {
      const weekend = new Date(at(-i)).getDay() % 6 === 0;
      const base = 4000 * scale[network] * size * (weekend ? 0.75 : 1);
      const impressions = Math.round(base * (0.7 + rand() * 0.8) * (1 + (days - i) / days / 2));
      const engagements = Math.round(impressions * (0.025 + rand() * 0.04));
      followers += Math.round((current - followers) / Math.max(i, 1) + (rand() - 0.4) * 20);
      rows.push({
        workspaceId,
        date: format(new Date(at(-i)), "yyyy-MM-dd"),
        network,
        followers: i === 0 ? current : followers,
        impressions,
        engagements,
        clicks: Math.round(engagements * (0.15 + rand() * 0.2)),
      });
    }
  }
  return rows;
}

export function buildPostMetrics(posts: Post[], seed: number): PostMetrics[] {
  const rand = seeded(seed);
  return posts
    .filter((p) => p.status === "published")
    .flatMap((p) =>
      p.networks.map((network) => {
        const impressions = Math.round(6000 * scale[network] * (0.5 + rand()));
        return {
          workspaceId: p.workspaceId,
          postId: p.id,
          network,
          impressions,
          likes: Math.round(impressions * (0.03 + rand() * 0.04)),
          comments: Math.round(impressions * (0.002 + rand() * 0.004)),
          shares: Math.round(impressions * (0.002 + rand() * 0.006)),
          clicks: Math.round(impressions * (0.005 + rand() * 0.01)),
        };
      }),
    );
}
