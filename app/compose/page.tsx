"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isBefore } from "date-fns";
import { AlertCircle, AlertTriangle, CalendarDays, ImagePlus, Save, Send, X } from "lucide-react";
import { MediaPicker } from "@/components/media-picker";
import { MediaThumb } from "@/components/media-thumb";
import { NetworkIcon } from "@/components/network-badge";
import { PostPreview } from "@/components/post-preview";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form";
import { EmptyState, PageHeader, PermissionNote } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { canEditPost } from "@/lib/permissions";
import { NETWORKS, NETWORK_IDS, charCount } from "@/lib/networks";
import type { NetworkId, Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { validateForNetwork } from "@/lib/validate";

export default function ComposePage() {
  return (
    <Suspense>
      <ComposeLoader />
    </Suspense>
  );
}

function ComposeLoader() {
  const params = useSearchParams();
  const { posts } = useStore();
  const id = params.get("post");
  const post = id ? posts.find((p) => p.id === id) : undefined;
  if (id && !post) {
    return <EmptyState title="Post not found" description="It may have been deleted." action={<Link href="/compose" className={buttonClass()}>New post</Link>} />;
  }
  return <Composer key={post?.id ?? "new"} initial={post} initialMedia={params.get("media")} />;
}

function Composer({ initial, initialMedia }: { initial?: Post; initialMedia?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const { accounts, media, workspaceSettings, actions, role, currentUser } = useStore();
  const connected = useMemo(() => new Set(accounts.filter((a) => a.connected).map((a) => a.network)), [accounts]);

  const [content, setContent] = useState(initial?.content ?? "");
  const [networks, setNetworks] = useState<NetworkId[]>(
    initial?.networks ?? NETWORK_IDS.filter((n) => workspaceSettings!.defaultNetworks.includes(n) && connected.has(n)),
  );
  const [mediaIds, setMediaIds] = useState<string[]>(
    initial?.mediaIds ?? (initialMedia && media.some((m) => m.id === initialMedia) ? [initialMedia] : []),
  );
  const [campaign, setCampaign] = useState(initial?.campaign ?? "");
  const [date, setDate] = useState(initial?.scheduledAt ? format(new Date(initial.scheduledAt), "yyyy-MM-dd") : "");
  const [time, setTime] = useState(initial?.scheduledAt ? format(new Date(initial.scheduledAt), "HH:mm") : "10:00");
  const [tab, setTab] = useState<NetworkId | undefined>(networks[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedMedia = mediaIds.map((id) => media.find((m) => m.id === id)).filter((m) => m !== undefined);
  const issues = Object.fromEntries(
    networks.map((n) => [n, validateForNetwork(n, content, selectedMedia)]),
  ) as Record<NetworkId, ReturnType<typeof validateForNetwork>>;
  const errorCount = networks.reduce((n, id) => n + issues[id].filter((i) => i.level === "error").length, 0);
  const activeTab = tab && networks.includes(tab) ? tab : networks[0];

  const readOnly = initial ? !canEditPost(role, currentUser!.id, initial) : !can("posts.create");
  const approver = can("posts.approve");
  const needsApproval = workspaceSettings!.requireApproval && !approver;
  const scheduledAt = date ? new Date(`${date}T${time || "09:00"}`) : null;

  function toggleNetwork(n: NetworkId) {
    setNetworks((cur) => {
      const next = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n];
      return NETWORK_IDS.filter((id) => next.includes(id));
    });
    if (!networks.includes(n)) setTab(n);
  }

  async function save(mode: "draft" | "schedule") {
    if (!networks.length) return toast("Pick at least one network.", "error");
    if (mode === "schedule") {
      if (!scheduledAt) return toast("Pick a date and time to schedule.", "error");
      if (isBefore(scheduledAt, new Date())) return toast("That time is in the past.", "error");
      if (errorCount) return toast(`Fix ${errorCount} issue${errorCount > 1 ? "s" : ""} before scheduling.`, "error");
    }
    setSaving(true);
    const status = mode === "draft" ? "draft" : needsApproval ? "pending" : "scheduled";
    const data = {
      content,
      networks,
      mediaIds,
      campaign: campaign.trim() || undefined,
      scheduledAt: scheduledAt?.toISOString() ?? null,
      status,
    } as const;
    const saved = initial
      ? await actions.updatePost(initial.id, data)
      : await actions.createPost(data);
    setSaving(false);
    if (!saved) return;

    if (mode === "draft") {
      toast(saved.scheduledAt ? "Draft saved" : "Draft saved — drag it onto the calendar to schedule");
      if (!initial) router.replace(`/compose?post=${saved.id}`);
    } else {
      toast(status === "pending" ? "Scheduled and sent for approval" : "Post scheduled");
      router.push("/calendar");
    }
  }

  return (
    <div>
      <PageHeader
        title={initial ? "Edit post" : "Compose"}
        description="Write once, check how it lands on every network, then schedule."
        actions={initial && <StatusBadge status={initial.status} />}
      />

      {readOnly && (
        <div className="mb-4">
          <PermissionNote>
            {initial?.status === "published"
              ? "This post has been published and can no longer be edited."
              : initial && can("posts.edit_own")
                ? "You can only edit your own posts. Managers and Admins can edit anyone's."
                : `As ${role === "Admin" || role === "Editor" ? "an" : "a"} ${role} in this workspace you can preview posts but not create or edit them.`}
          </PermissionNote>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Networks" description={`${networks.length} selected`} />
            <CardBody className="flex flex-wrap gap-2">
              {NETWORK_IDS.map((n) => {
                const on = networks.includes(n);
                const available = connected.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={readOnly || (!available && !on)}
                    onClick={() => toggleNetwork(n)}
                    aria-pressed={on}
                    title={available ? NETWORKS[n].name : `${NETWORKS[n].name} isn't connected`}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                      on ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2",
                    )}
                  >
                    <NetworkIcon network={n} size={22} className="rounded-full" decorative />
                    {NETWORKS[n].name}
                  </button>
                );
              })}
              {connected.size < NETWORK_IDS.length && (
                <Link href="/accounts" className="self-center text-xs text-primary hover:underline">
                  Connect more accounts
                </Link>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Post" />
            <CardBody className="space-y-4">
              <div>
                <Label htmlFor="content">Caption</Label>
                <Textarea
                  id="content"
                  rows={7}
                  value={content}
                  disabled={readOnly}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What do you want to share? Use #hashtags and links; previews update as you type."
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {networks.map((n) => {
                    const used = charCount(content, n);
                    const limit = NETWORKS[n].charLimit;
                    return (
                      <span
                        key={n}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pr-2 pl-0.5 text-[11px] tabular-nums",
                          used > limit ? "bg-danger-soft text-danger" : "text-muted",
                        )}
                      >
                        <NetworkIcon network={n} size={16} className="rounded-full" />
                        {used.toLocaleString()}/{limit.toLocaleString()}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Media</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedMedia.map((m) => (
                    <div key={m.id} className="relative">
                      <MediaThumb item={m} aspect={1} className="h-20 w-20 rounded-lg" />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => setMediaIds((ids) => ids.filter((x) => x !== m.id))}
                          aria-label={`Remove ${m.name}`}
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted hover:border-primary hover:text-primary"
                    >
                      <ImagePlus className="h-5 w-5" />
                      Add
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="campaign">Campaign (optional)</Label>
                <Input id="campaign" value={campaign} disabled={readOnly} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Autumn launch" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Schedule"
              description={needsApproval ? "Scheduling sends this post to a Manager or Admin for approval." : "Approvers can schedule directly."}
            />
            <CardBody>
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={date} disabled={readOnly || !can("posts.schedule")} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={time} disabled={readOnly || !can("posts.schedule")} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">
                Times are in {workspaceSettings!.timezone.replace("_", " ")}. Leave the date empty to save a draft you can drag onto the calendar.
              </p>

              {!readOnly && (
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                  <Link href="/calendar" className={buttonClass({ variant: "ghost", className: "sm:mr-auto" })}>
                    <CalendarDays className="h-4 w-4" />
                    Open calendar
                  </Link>
                  <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
                    <Save className="h-4 w-4" />
                    Save draft
                  </Button>
                  <Button onClick={() => save("schedule")} disabled={saving || !can("posts.schedule")}>
                    <Send className="h-4 w-4" />
                    {needsApproval ? "Schedule & send for approval" : "Schedule"}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader
              title="Preview"
              description={errorCount ? `${errorCount} issue${errorCount > 1 ? "s" : ""} to fix` : networks.length ? "Looks good on every network" : undefined}
            />
            {networks.length && activeTab ? (
              <CardBody className="space-y-4">
                <Tabs
                  value={activeTab}
                  onChange={setTab}
                  items={networks.map((n) => ({
                    value: n,
                    label: (
                      <>
                        <NetworkIcon network={n} size={16} className="rounded" decorative />
                        {NETWORKS[n].name}
                        {issues[n].some((i) => i.level === "error") && <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-label="Has errors" />}
                      </>
                    ),
                  }))}
                />
                <PostPreview
                  network={activeTab}
                  content={content}
                  media={selectedMedia}
                  account={accounts.find((a) => a.network === activeTab)}
                />
                <ul className="space-y-1.5 text-xs">
                  <li className="text-muted">
                    Limit {NETWORKS[activeTab].charLimit.toLocaleString()} chars
                    {NETWORKS[activeTab].truncateAt && ` · “more” after ${NETWORKS[activeTab].truncateAt}`} · crop {NETWORKS[activeTab].aspectLabel}
                  </li>
                  {issues[activeTab].map((issue) => (
                    <li key={issue.message} className={cn("flex items-start gap-1.5", issue.level === "error" ? "text-danger" : "text-warning")}>
                      {issue.level === "error" ? <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </CardBody>
            ) : (
              <EmptyState title="No networks selected" description="Pick at least one network to see a preview." />
            )}
          </Card>
        </div>
      </div>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} selected={mediaIds} onConfirm={setMediaIds} />
    </div>
  );
}
