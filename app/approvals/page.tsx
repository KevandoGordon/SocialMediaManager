"use client";

import { useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isBefore } from "date-fns";
import { CheckCircle2, MessageSquareWarning, Pencil, RotateCcw } from "lucide-react";
import { CommentThread } from "@/components/comment-thread";
import { MasterDetail } from "@/components/master-detail";
import { NetworkIcon, NetworkStack } from "@/components/network-badge";
import { PostPreview } from "@/components/post-preview";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { EmptyState, PageHeader, PermissionNote } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { canEditPost } from "@/lib/permissions";
import { NETWORKS } from "@/lib/networks";
import type { NetworkId, Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "pending" | "changes_requested" | "scheduled";

export default function ApprovalsPage() {
  const { posts, members } = useStore();
  const [filter, setFilter] = useState<Filter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byStatus = (s: PostStatus) =>
    posts.filter((p) => p.status === s).sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  const queue = byStatus(filter);
  const selected = posts.find((p) => p.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader title="Approvals" description="Review posts before they go live. Approved posts are scheduled automatically." />
      <Tabs
        className="mb-4"
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setSelectedId(null);
        }}
        items={[
          { value: "pending", label: "Pending", count: byStatus("pending").length },
          { value: "changes_requested", label: "Changes requested", count: byStatus("changes_requested").length },
          { value: "scheduled", label: "Approved", count: byStatus("scheduled").length },
        ]}
      />
      <MasterDetail
        hasSelection={!!selected}
        onBack={() => setSelectedId(null)}
        backLabel="Back to queue"
        list={
          queue.length ? (
            <ul className="divide-y divide-border">
              {queue.map((p) => {
                const author = members.find((u) => u.id === p.authorId);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={cn("block w-full px-4 py-3 text-left transition hover:bg-surface-2", selectedId === p.id && "bg-primary-soft hover:bg-primary-soft")}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted">
                        {author && <Avatar name={author.name} color={author.color} size={20} />}
                        <span className="font-medium text-foreground">{author?.name}</span>
                        <span className="ml-auto">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm">{p.content}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                        <NetworkStack networks={p.networks} size={16} />
                        {p.scheduledAt && <span>{format(new Date(p.scheduledAt), "EEE d MMM, HH:mm")}</span>}
                        {p.comments.length > 0 && <span>{p.comments.length} comment{p.comments.length > 1 ? "s" : ""}</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="Queue is empty" description="Nothing in this list right now." />
          )
        }
        detail={selected ? <ApprovalDetail key={selected.id} post={selected} /> : <Card><EmptyState title="Select a post" description="Pick a post from the queue to review it." /></Card>}
      />
    </div>
  );
}

function ApprovalDetail({ post }: { post: Post }) {
  const { media, accounts, members, actions, role, currentUser } = useStore();
  const can = useCan();
  const toast = useToast();
  const [tab, setTab] = useState<NetworkId>(post.networks[0]);
  const [changesOpen, setChangesOpen] = useState(false);
  const [note, setNote] = useState("");

  const items = post.mediaIds.map((id) => media.find((m) => m.id === id)).filter((m) => m !== undefined);
  const author = members.find((u) => u.id === post.authorId);
  const approver = can("posts.approve");
  const overdue = post.scheduledAt && isBefore(new Date(post.scheduledAt), new Date());

  async function approve() {
    if (await actions.updatePost(post.id, { status: "scheduled" })) toast("Approved and scheduled");
  }

  async function requestChanges() {
    if (!note.trim()) return;
    if (!(await actions.commentOnPost(post.id, note.trim()))) return;
    const ok = await actions.updatePost(post.id, { status: "changes_requested" });
    setChangesOpen(false);
    setNote("");
    if (ok) toast("Changes requested");
  }

  async function resubmit() {
    if (await actions.updatePost(post.id, { status: "pending" })) toast(post.status === "scheduled" ? "Approval revoked" : "Resubmitted for approval");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={post.status} />
              {post.campaign && <span className="text-xs font-normal text-muted">{post.campaign}</span>}
            </span>
          }
          description={`By ${author?.name ?? "Unknown"}${post.scheduledAt ? ` · goes live ${format(new Date(post.scheduledAt), "EEEE d MMM 'at' HH:mm")}` : ""}`}
        />
        <CardBody className="space-y-4">
          {overdue && post.status === "pending" && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">The scheduled time has passed. Reschedule on the calendar after approving.</p>
          )}

          {post.status === "pending" &&
            (approver ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="success" onClick={approve}>
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setChangesOpen(true)}>
                  <MessageSquareWarning className="h-4 w-4" />
                  Request changes
                </Button>
              </div>
            ) : (
              <PermissionNote>Only Managers and Admins can approve posts. You can still leave a comment below.</PermissionNote>
            ))}

          {post.status === "changes_requested" && canEditPost(role, currentUser!.id, post) && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/compose?post=${post.id}`} className={buttonClass({ variant: "outline" })}>
                <Pencil className="h-4 w-4" />
                Edit post
              </Link>
              <Button onClick={resubmit}>
                <RotateCcw className="h-4 w-4" />
                Resubmit for approval
              </Button>
            </div>
          )}

          {post.status === "scheduled" && approver && (
            <Button variant="outline" onClick={resubmit}>
              <RotateCcw className="h-4 w-4" />
              Revoke approval
            </Button>
          )}

          <div>
            <Tabs
              value={tab}
              onChange={setTab}
              items={post.networks.map((n) => ({
                value: n,
                label: (
                  <>
                    <NetworkIcon network={n} size={16} className="rounded" decorative />
                    {NETWORKS[n].name}
                  </>
                ),
              }))}
            />
            <div className="mt-4">
              <PostPreview network={tab} content={post.content} media={items} account={accounts.find((a) => a.network === tab)} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Comments" description="Visible to everyone in the workspace" />
        <CardBody>
          <CommentThread
            entries={post.comments}
            canPost={can("comments.create")}
            placeholder="Leave feedback for the author…"
            onSubmit={async (body) => {
              const ok = await actions.commentOnPost(post.id, body);
              if (ok) toast("Comment added");
              return !!ok;
            }}
          />
        </CardBody>
      </Card>

      <Dialog
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request changes"
        footer={
          <>
            <Button variant="outline" onClick={() => setChangesOpen(false)}>Cancel</Button>
            <Button onClick={requestChanges} disabled={!note.trim()}>Send to author</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">Tell {author?.name.split(" ")[0] ?? "the author"} what to change. This is added as a comment.</p>
        <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please add the time zone and speaker names." aria-label="What needs to change" autoFocus />
      </Dialog>
    </div>
  );
}
