"use client";

import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useStore } from "@/lib/data/store";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MediaThumb } from "./media-thumb";
import { NetworkStack } from "./network-badge";
import { StatusBadge } from "./status-badge";

export function PostSummary({ post, className, showStatus = true }: { post: Post; className?: string; showStatus?: boolean }) {
  const { media, members } = useStore();
  const thumb = media.find((m) => m.id === post.mediaIds[0]);
  const author = members.find((u) => u.id === post.authorId);
  return (
    <div className={cn("flex gap-3", className)}>
      {thumb ? (
        <MediaThumb item={thumb} aspect={1} showType={false} className="h-12 w-12 shrink-0 rounded-lg" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs text-muted">Aa</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm">{post.content}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <NetworkStack networks={post.networks} size={16} />
          {post.scheduledAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {format(new Date(post.scheduledAt), "EEE d MMM, HH:mm")}
            </span>
          )}
          {author && <span>by {author.name}</span>}
          {showStatus && <StatusBadge status={post.status} />}
        </div>
      </div>
    </div>
  );
}
