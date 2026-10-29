import type { PostStatus } from "@/lib/types";
import { Badge, type BadgeTone } from "./ui/badge";

export const STATUS: Record<PostStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Pending approval", tone: "warning" },
  changes_requested: { label: "Changes requested", tone: "danger" },
  scheduled: { label: "Scheduled", tone: "primary" },
  published: { label: "Published", tone: "success" },
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}
