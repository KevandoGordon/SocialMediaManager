import type { NetworkId } from "./types";

export interface NetworkSpec {
  id: NetworkId;
  name: string;
  /** Brand-ish accent used for chips and chart series. */
  color: string;
  /** Short glyph shown in the network badge. */
  glyph: string;
  charLimit: number;
  /** Characters visible in the feed before a "more" link; null = no truncation. */
  truncateAt: number | null;
  /** Feed image crop as width / height. */
  aspect: number;
  aspectLabel: string;
  requiresMedia: "none" | "image" | "video";
  maxMedia: number;
  maxHashtags?: number;
}

export const NETWORKS: Record<NetworkId, NetworkSpec> = {
  facebook: {
    id: "facebook",
    name: "Facebook",
    color: "#1877f2",
    glyph: "f",
    charLimit: 63206,
    truncateAt: 477,
    aspect: 1.91,
    aspectLabel: "1.91:1",
    requiresMedia: "none",
    maxMedia: 10,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    color: "#e1306c",
    glyph: "IG",
    charLimit: 2200,
    truncateAt: 125,
    aspect: 4 / 5,
    aspectLabel: "4:5",
    requiresMedia: "image",
    maxMedia: 10,
    maxHashtags: 30,
  },
  x: {
    id: "x",
    name: "X",
    color: "#71717a",
    glyph: "𝕏",
    charLimit: 280,
    truncateAt: null,
    aspect: 16 / 9,
    aspectLabel: "16:9",
    requiresMedia: "none",
    maxMedia: 4,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0a66c2",
    glyph: "in",
    charLimit: 3000,
    truncateAt: 210,
    aspect: 1.91,
    aspectLabel: "1.91:1",
    requiresMedia: "none",
    maxMedia: 9,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    color: "#25f4ee",
    glyph: "♪",
    charLimit: 2200,
    truncateAt: 100,
    aspect: 9 / 16,
    aspectLabel: "9:16",
    requiresMedia: "video",
    maxMedia: 1,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    color: "#ff0000",
    glyph: "▶",
    charLimit: 5000,
    truncateAt: 157,
    aspect: 16 / 9,
    aspectLabel: "16:9",
    requiresMedia: "video",
    maxMedia: 1,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    color: "#e60023",
    glyph: "P",
    charLimit: 500,
    truncateAt: 60,
    aspect: 2 / 3,
    aspectLabel: "2:3",
    requiresMedia: "image",
    maxMedia: 1,
  },
  threads: {
    id: "threads",
    name: "Threads",
    color: "#a855f7",
    glyph: "@",
    charLimit: 500,
    truncateAt: null,
    aspect: 1,
    aspectLabel: "1:1",
    requiresMedia: "none",
    maxMedia: 10,
  },
};

export const NETWORK_IDS = Object.keys(NETWORKS) as NetworkId[];

export function countHashtags(text: string) {
  return (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
}

/** X counts every URL as 23 characters. */
export function charCount(text: string, network: NetworkId) {
  if (network !== "x") return [...text].length;
  return [...text.replace(/https?:\/\/\S+/g, "x".repeat(23))].length;
}
