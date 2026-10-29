"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarX2, Pencil, Send, Trash2 } from "lucide-react";
import { useCan, useStore } from "@/lib/data/store";
import { canDeletePost, canEditPost } from "@/lib/permissions";
import type { Post } from "@/lib/types";
import { MediaThumb } from "./media-thumb";
import { NetworkStack } from "./network-badge";
import { StatusBadge } from "./status-badge";
import { Button, buttonClass } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { useToast } from "./ui/toast";

export function PostDetailDialog({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const { media, members, workspaceSettings, actions, role, currentUser } = useStore();
  const can = useCan();
  const toast = useToast();
  if (!post) return null;

  const author = members.find((u) => u.id === post.authorId);
  const items = post.mediaIds.map((id) => media.find((m) => m.id === id)).filter((m) => m !== undefined);
  const editable = canEditPost(role, currentUser!.id, post);
  const canSubmit = editable && post.scheduledAt && (post.status === "draft" || post.status === "changes_requested");
  const direct = can("posts.approve") || !workspaceSettings!.requireApproval;

  async function submit() {
    if (await actions.updatePost(post!.id, { status: direct ? "scheduled" : "pending" })) toast(direct ? "Post scheduled" : "Sent for approval");
    onClose();
  }

  async function unschedule() {
    if (await actions.updatePost(post!.id, { scheduledAt: null, status: "draft" })) toast("Moved back to drafts");
    onClose();
  }

  async function remove() {
    if (await actions.deletePost(post!.id)) toast("Post deleted");
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={post.scheduledAt ? format(new Date(post.scheduledAt), "EEEE d MMMM, HH:mm") : "Unscheduled draft"}
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          {canDeletePost(role, currentUser!.id, post) && (
            <Button variant="ghost" className="mr-auto text-danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          {post.status !== "published" && can("posts.schedule") && post.scheduledAt && (
            <Button variant="outline" onClick={unschedule}>
              <CalendarX2 className="h-4 w-4" />
              Unschedule
            </Button>
          )}
          {editable && (
            <Link href={`/compose?post=${post.id}`} className={buttonClass({ variant: "outline" })}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          )}
          {canSubmit && (
            <Button onClick={submit}>
              <Send className="h-4 w-4" />
              {direct ? "Schedule" : "Send for approval"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} />
          <NetworkStack networks={post.networks} />
          {post.campaign && <span className="text-xs text-muted">· {post.campaign}</span>}
        </div>
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {items.map((m) => (
              <MediaThumb key={m.id} item={m} aspect={1} className="rounded-lg" />
            ))}
          </div>
        )}
        <p className="text-xs text-muted">
          By {author?.name ?? "a former member"} · {post.comments.length} comment{post.comments.length === 1 ? "" : "s"}
          {(post.status === "pending" || post.status === "changes_requested") && (
            <>
              {" · "}
              <Link href="/approvals" className="text-primary hover:underline">
                Open in Approvals
              </Link>
            </>
          )}
        </p>
        {post.status === "draft" && !post.scheduledAt && (
          <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">Drag this draft onto a day in the calendar to give it a time, then send it for approval.</p>
        )}
      </div>
    </Dialog>
  );
}
