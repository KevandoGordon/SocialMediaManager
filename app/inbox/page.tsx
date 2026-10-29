"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Inbox, MessageCircle, Mail, RotateCcw, Search } from "lucide-react";
import { CommentThread } from "@/components/comment-thread";
import { MasterDetail } from "@/components/master-detail";
import { NetworkIcon } from "@/components/network-badge";
import { PostSummary } from "@/components/post-summary";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { can as roleCan } from "@/lib/permissions";
import { NETWORKS, NETWORK_IDS } from "@/lib/networks";
import type { InboxItem, NetworkId } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "open" | "mine" | "unassigned" | "done";

export default function InboxPage() {
  const { inbox, members, currentUser, actions } = useStore();
  const [view, setView] = useState<View>("open");
  const [network, setNetwork] = useState<NetworkId | "all">("all");
  const [kind, setKind] = useState<"all" | "comment" | "dm">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matchesView = (i: InboxItem, v: View) =>
    v === "done" ? i.status === "done" : i.status === "open" && (v === "open" || (v === "mine" ? i.assigneeId === currentUser?.id : !i.assigneeId));
  const q = query.trim().toLowerCase();
  const list = inbox
    .filter((i) => matchesView(i, view))
    .filter((i) => network === "all" || i.network === network)
    .filter((i) => kind === "all" || i.kind === kind)
    .filter((i) => !q || i.body.toLowerCase().includes(q) || i.from.name.toLowerCase().includes(q))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const selected = inbox.find((i) => i.id === selectedId) ?? null;

  function open(item: InboxItem) {
    setSelectedId(item.id);
    if (!item.read) actions.updateInboxItem(item.id, { read: true });
  }

  return (
    <div>
      <PageHeader title="Inbox" description="Comments and DMs from every network, in one place." />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <Tabs
          value={view}
          onChange={(v) => {
            setView(v);
            setSelectedId(null);
          }}
          items={(["open", "mine", "unassigned", "done"] as View[]).map((v) => ({
            value: v,
            label: { open: "All open", mine: "Assigned to me", unassigned: "Unassigned", done: "Done" }[v],
            count: inbox.filter((i) => matchesView(i, v)).length,
          }))}
        />
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-9" aria-label="Search messages" />
          </div>
          <Select aria-label="Network" value={network} onChange={(e) => setNetwork(e.target.value as NetworkId | "all")} className="w-auto">
            <option value="all">All networks</option>
            {NETWORK_IDS.map((n) => <option key={n} value={n}>{NETWORKS[n].name}</option>)}
          </Select>
          <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="w-auto">
            <option value="all">Comments & DMs</option>
            <option value="comment">Comments</option>
            <option value="dm">DMs</option>
          </Select>
        </div>
      </div>

      <MasterDetail
        hasSelection={!!selected}
        onBack={() => setSelectedId(null)}
        backLabel="Back to inbox"
        list={
          list.length ? (
            <ul className="divide-y divide-border">
              {list.map((i) => {
                const assignee = members.find((u) => u.id === i.assigneeId);
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => open(i)}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-surface-2", selectedId === i.id && "bg-primary-soft hover:bg-primary-soft")}
                    >
                      <NetworkIcon network={i.network} size={28} className="rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("truncate text-sm", !i.read ? "font-semibold" : "font-medium")}>{i.from.name}</span>
                          {!i.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                          <span className="ml-auto shrink-0 text-xs text-muted">{formatDistanceToNow(new Date(i.receivedAt))}</span>
                        </div>
                        <p className={cn("mt-0.5 line-clamp-2 text-sm", i.read ? "text-muted" : "text-foreground")}>{i.body}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                          {i.kind === "dm" ? <Mail className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                          {i.kind === "dm" ? "Direct message" : "Comment"}
                          {assignee ? (
                            <span className="ml-auto inline-flex items-center gap-1">
                              <Avatar name={assignee.name} color={assignee.color} size={16} />
                              {assignee.name.split(" ")[0]}
                            </span>
                          ) : (
                            <span className="ml-auto">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Inbox className="h-6 w-6" />} title="Nothing here" description="No conversations match these filters." />
          )
        }
        detail={selected ? <Conversation key={selected.id} item={selected} /> : <Card><EmptyState title="Select a conversation" description="Pick a message to read and reply." /></Card>}
      />
    </div>
  );
}

function Conversation({ item }: { item: InboxItem }) {
  const { members, posts, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const post = posts.find((p) => p.id === item.postId);
  const assignable = members.filter((m) => roleCan(m.role, "inbox.reply"));
  const assignee = members.find((u) => u.id === item.assigneeId);

  const entries = [
    { id: item.id, authorName: `${item.from.name} (${item.from.handle})`, body: item.body, createdAt: item.receivedAt },
    ...item.replies,
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <NetworkIcon network={item.network} size={20} />
              {item.from.name}
              <span className="font-normal text-muted">{item.from.handle}</span>
            </span>
          }
          description={`${item.kind === "dm" ? "Direct message" : "Comment"} on ${NETWORKS[item.network].name}`}
          action={item.status === "done" ? <Badge tone="success">Done</Badge> : <Badge tone="primary">Open</Badge>}
        />
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <Label htmlFor="assignee">Assigned to</Label>
              {can("inbox.assign") ? (
                <Select
                  id="assignee"
                  value={item.assigneeId ?? ""}
                  onChange={async (e) => {
                    const id = e.target.value || null;
                    if (!(await actions.updateInboxItem(item.id, { assigneeId: id }))) return;
                    toast(id ? `Assigned to ${members.find((u) => u.id === id)?.name}` : "Unassigned");
                  }}
                >
                  <option value="">Unassigned</option>
                  {assignable.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
                </Select>
              ) : (
                <p id="assignee" className="flex h-9 items-center text-sm text-muted" title="Managers and Admins can assign conversations">
                  {assignee?.name ?? "Unassigned"}
                </p>
              )}
            </div>
            {can("inbox.reply") && (
              <Button
                variant="outline"
                className="sm:ml-auto"
                onClick={async () => {
                  const done = item.status === "open";
                  if (!(await actions.updateInboxItem(item.id, { status: done ? "done" : "open" }))) return;
                  toast(done ? "Marked as done" : "Reopened");
                }}
              >
                {item.status === "open" ? <CheckCheck className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                {item.status === "open" ? "Mark done" : "Reopen"}
              </Button>
            )}
          </div>

          {post && (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs text-muted">On your post</p>
              <PostSummary post={post} showStatus={false} />
            </div>
          )}

          <CommentThread
            entries={entries}
            canPost={can("inbox.reply")}
            placeholder={`Reply to ${item.from.name.split(" ")[0]} on ${NETWORKS[item.network].name}…`}
            submitLabel="Send reply"
            disabledNote="Your role here can read conversations but not reply."
            onSubmit={async (body) => {
              const ok = await actions.replyToInboxItem(item.id, body);
              if (ok) toast("Reply saved (demo: not posted to the network)");
              return !!ok;
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
