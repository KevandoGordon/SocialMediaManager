"use client";

import { useState } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Repeat2, Send, Share, ThumbsUp } from "lucide-react";
import { NETWORKS, charCount } from "@/lib/networks";
import type { Account, MediaItem, NetworkId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MediaThumb } from "./media-thumb";
import { NetworkIcon } from "./network-badge";

/** Highlights hashtags, mentions and links the way feeds do. */
function RichText({ text, accent }: { text: string; accent: string }) {
  const parts = text.split(/(https?:\/\/\S+|[#@][\p{L}\p{N}_]+)/gu);
  return (
    <>
      {parts.map((part, i) =>
        /^(https?:\/\/|[#@])/.test(part) ? (
          <span key={i} style={{ color: accent }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Feed-style caption: truncates with a "more" link and marks text past the hard limit in red. */
function Caption({ network, text, accent, className }: { network: NetworkId; text: string; accent: string; className?: string }) {
  const spec = NETWORKS[network];
  const [expanded, setExpanded] = useState(false);
  const chars = [...text];
  const overBy = charCount(text, network) - spec.charLimit;
  const allowed = overBy > 0 ? chars.slice(0, chars.length - overBy).join("") : text;
  const excess = overBy > 0 ? chars.slice(chars.length - overBy).join("") : "";
  const truncated = !expanded && spec.truncateAt !== null && chars.length > spec.truncateAt;

  if (!text) return <p className={cn("text-sm text-muted italic", className)}>Your caption appears here…</p>;
  return (
    <p className={cn("text-sm leading-relaxed break-words whitespace-pre-wrap", className)}>
      {truncated ? (
        <>
          <RichText text={chars.slice(0, spec.truncateAt!).join("").trimEnd()} accent={accent} />
          <button type="button" onClick={() => setExpanded(true)} className="text-muted hover:underline">
            {network === "facebook" ? "… See more" : "… more"}
          </button>
        </>
      ) : (
        <>
          <RichText text={allowed} accent={accent} />
          {excess && <mark className="rounded-sm bg-danger-soft text-danger">{excess}</mark>}
        </>
      )}
    </p>
  );
}

function MediaBlock({ media, aspect, className }: { media: MediaItem[]; aspect: number; className?: string }) {
  if (!media.length) return null;
  return (
    <div className={cn("relative", className)}>
      <MediaThumb item={media[0]} aspect={aspect} className="w-full" />
      {media.length > 1 && (
        <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">1/{media.length}</span>
      )}
    </div>
  );
}

function ProfileRow({ account, network, subtitle }: { account?: Account; network: NetworkId; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">N</span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold">{account?.name ?? "Northwind"}</p>
        <p className="truncate text-xs text-muted">{subtitle ?? account?.handle}</p>
      </div>
      <NetworkIcon network={network} size={18} />
    </div>
  );
}

export function PostPreview({
  network,
  content,
  media,
  account,
}: {
  network: NetworkId;
  content: string;
  media: MediaItem[];
  account?: Account;
}) {
  const spec = NETWORKS[network];
  const accent = network === "x" || network === "threads" || network === "tiktok" ? "var(--primary)" : spec.color;
  const video = media.find((m) => m.type === "video");

  const frame = "mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface text-foreground";

  switch (network) {
    case "instagram":
      return (
        <div className={frame}>
          <div className="px-3 py-2.5">
            <ProfileRow account={account} network={network} subtitle="Sponsored · Original audio" />
          </div>
          {media.length ? <MediaBlock media={media} aspect={spec.aspect} /> : <div className="flex aspect-[4/5] items-center justify-center bg-surface-2 text-xs text-muted">Instagram needs an image</div>}
          <div className="flex items-center gap-4 px-3 pt-2.5">
            <Heart className="h-5 w-5" /> <MessageCircle className="h-5 w-5" /> <Send className="h-5 w-5" />
            <Bookmark className="ml-auto h-5 w-5" />
          </div>
          <div className="px-3 pt-1.5 pb-3">
            <Caption network={network} text={content} accent={accent} />
          </div>
        </div>
      );

    case "tiktok":
      return (
        <div className={cn(frame, "max-w-[260px]")}>
          <div className="relative">
            {video ? (
              <MediaThumb item={video} aspect={spec.aspect} showType={false} />
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center bg-neutral-900 p-6 text-center text-xs text-neutral-400">TikTok needs a vertical video</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12 text-white">
              <p className="text-sm font-semibold">{account?.handle ?? "@northwind"}</p>
              <Caption network={network} text={content} accent="#fff" className="text-[13px] [&_span]:!text-white" />
            </div>
          </div>
        </div>
      );

    case "youtube": {
      const [title, ...rest] = content.split("\n");
      return (
        <div className={frame}>
          {video ? (
            <MediaThumb item={video} aspect={spec.aspect} />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-neutral-900 text-xs text-neutral-400">YouTube needs a video</div>
          )}
          <div className="space-y-2 p-3">
            <p className="line-clamp-2 text-sm font-semibold">{title.slice(0, 100) || "Video title"}</p>
            <ProfileRow account={account} network={network} subtitle="9.8K subscribers" />
            <div className="rounded-lg bg-surface-2 p-2.5">
              <p className="mb-1 text-xs font-medium">Description</p>
              <Caption network={network} text={rest.join("\n").trim() || content} accent={accent} className="text-xs" />
            </div>
          </div>
        </div>
      );
    }

    case "pinterest": {
      const [title, ...rest] = content.split(/(?<=[.!?])\s/);
      return (
        <div className={cn(frame, "max-w-[280px] border-0 bg-transparent")}>
          {media.length ? <MediaBlock media={media} aspect={spec.aspect} className="overflow-hidden rounded-2xl" /> : <div className="flex aspect-[2/3] items-center justify-center rounded-2xl bg-surface-2 text-xs text-muted">Pinterest needs an image</div>}
          <div className="px-1 pt-2">
            <p className="line-clamp-2 text-sm font-semibold">{title}</p>
            {rest.length > 0 && <Caption network={network} text={rest.join(" ")} accent={accent} className="text-xs text-muted" />}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">N</span>
              {account?.name ?? "Northwind"}
            </div>
          </div>
        </div>
      );
    }

    case "x":
    case "threads":
      return (
        <div className={cn(frame, "p-3")}>
          <div className="flex gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">N</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm">
                <span className="font-semibold">{account?.name ?? "Northwind"}</span>
                <span className="truncate text-muted">{account?.handle} · now</span>
                <MoreHorizontal className="ml-auto h-4 w-4 text-muted" />
              </p>
              <Caption network={network} text={content} accent={accent} className="mt-0.5" />
              {media.length > 0 && (
                <div className={cn("mt-2.5 grid gap-0.5 overflow-hidden rounded-xl border border-border", media.length > 1 && "grid-cols-2")}>
                  {media.slice(0, 4).map((m) => (
                    <MediaThumb key={m.id} item={m} aspect={media.length > 1 ? 1 : spec.aspect} />
                  ))}
                </div>
              )}
              <div className="mt-2.5 flex justify-between pr-6 text-muted">
                <MessageCircle className="h-4 w-4" /> <Repeat2 className="h-4 w-4" /> <Heart className="h-4 w-4" /> <Share className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      );

    default:
      // Facebook and LinkedIn share a text-first layout with a wide image below.
      return (
        <div className={frame}>
          <div className="space-y-2.5 p-3">
            <ProfileRow account={account} network={network} subtitle={network === "linkedin" ? `${(account?.followers ?? 0).toLocaleString()} followers · now` : "Just now · 🌐"} />
            <Caption network={network} text={content} accent={accent} />
          </div>
          <MediaBlock media={media} aspect={spec.aspect} />
          <div className="flex justify-around border-t border-border py-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {network === "linkedin" ? "Like" : "Like"}</span>
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Comment</span>
            <span className="inline-flex items-center gap-1">{network === "linkedin" ? <Repeat2 className="h-3.5 w-3.5" /> : <Share className="h-3.5 w-3.5" />} {network === "linkedin" ? "Repost" : "Share"}</span>
          </div>
        </div>
      );
  }
}
