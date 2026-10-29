import { NETWORKS, charCount, countHashtags } from "./networks";
import type { MediaItem, NetworkId } from "./types";

export interface Issue {
  level: "error" | "warning";
  message: string;
}

/** Per-network checks shown in the Compose preview. Errors block scheduling; warnings don't. */
export function validateForNetwork(network: NetworkId, content: string, media: MediaItem[]): Issue[] {
  const spec = NETWORKS[network];
  const issues: Issue[] = [];
  const count = charCount(content, network);

  if (count > spec.charLimit) {
    issues.push({ level: "error", message: `${count - spec.charLimit} characters over the ${spec.charLimit.toLocaleString()} limit.` });
  } else if (spec.truncateAt && count > spec.truncateAt) {
    issues.push({ level: "warning", message: `Truncated after ${spec.truncateAt} characters behind a "more" link.` });
  }

  if (!content.trim() && media.length === 0) {
    issues.push({ level: "error", message: "Add text or media." });
  }

  const hasVideo = media.some((m) => m.type === "video");
  const hasImage = media.some((m) => m.type === "image");
  if (spec.requiresMedia === "video" && !hasVideo) {
    issues.push({ level: "error", message: `${spec.name} requires a video.` });
  }
  if (spec.requiresMedia === "image" && media.length === 0) {
    issues.push({ level: "error", message: `${spec.name} requires an image or video.` });
  }
  if ((network === "tiktok" || network === "youtube") && hasImage) {
    issues.push({ level: "warning", message: `Images are ignored on ${spec.name}; only the video is posted.` });
  }
  if (media.length > spec.maxMedia) {
    issues.push({ level: "error", message: `${spec.name} allows at most ${spec.maxMedia} media item${spec.maxMedia === 1 ? "" : "s"}.` });
  }
  if (network === "x" && hasVideo && media.length > 1) {
    issues.push({ level: "error", message: "X can't mix a video with other media." });
  }

  const tags = countHashtags(content);
  if (spec.maxHashtags && tags > spec.maxHashtags) {
    issues.push({ level: "error", message: `${tags} hashtags; ${spec.name} allows ${spec.maxHashtags}.` });
  } else if ((network === "linkedin" || network === "x") && tags > 3) {
    issues.push({ level: "warning", message: `${tags} hashtags may reduce reach on ${spec.name}; 1–3 is typical.` });
  }

  const first = media[0];
  if (first && first.type === "image" && network !== "tiktok" && network !== "youtube") {
    const ratio = first.width / first.height;
    if (Math.abs(ratio - spec.aspect) / spec.aspect > 0.15) {
      issues.push({ level: "warning", message: `Image will be cropped to ${spec.aspectLabel}.` });
    }
  }
  return issues;
}
