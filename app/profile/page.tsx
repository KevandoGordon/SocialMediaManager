"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, Switch } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import type { NotificationPrefs } from "@/lib/types";
import { cn } from "@/lib/utils";

const NOTIFICATIONS: { key: Exclude<keyof NotificationPrefs, "channel">; label: string; description: string }[] = [
  { key: "approvalRequests", label: "Approval requests", description: "When a post is waiting for your review." },
  { key: "approvalDecisions", label: "Approval decisions", description: "When your post is approved or needs changes." },
  { key: "newMessages", label: "Assigned messages", description: "When an inbox conversation is assigned to you." },
  { key: "negativeMentions", label: "Negative mentions", description: "When a mention is flagged as negative." },
  { key: "weeklyReport", label: "Weekly report", description: "A Monday summary of last week's performance." },
];

/** Account-level settings. Independent of whichever workspace is active. */
export default function ProfilePage() {
  const { session, actions } = useStore();
  const toast = useToast();
  const [name, setName] = useState(session?.user.name ?? "");
  const [title, setTitle] = useState(session?.user.title ?? "");
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(session?.notifications ?? null);

  if (!session || !prefs) return null;
  const profileDirty = name !== session.user.name || title !== session.user.title;
  const prefsDirty = JSON.stringify(prefs) !== JSON.stringify(session.notifications);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Profile" description="Your account across all workspaces. Workspace preferences live in each workspace's settings." />

      <Card>
        <CardHeader title="Account" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            </div>
            <div>
              <Label htmlFor="title">Job title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={session.user.email} disabled />
            <p className="mt-1.5 text-xs text-muted">Your email identifies your account and receives invitations. It can&apos;t be changed yet.</p>
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!profileDirty}
              onClick={async () => {
                if (await actions.updateProfile({ name, title })) toast("Profile saved");
              }}
            >
              Save profile
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notifications" description="Applies in every workspace. Email delivery isn't connected yet." />
        <CardBody className="space-y-4">
          {NOTIFICATIONS.map((n) => (
            <div key={n.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted">{n.description}</p>
              </div>
              <Switch label={n.label} checked={prefs[n.key]} onChange={(v) => setPrefs({ ...prefs, [n.key]: v })} />
            </div>
          ))}
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
            <div className="sm:w-60">
              <Label htmlFor="channel">Deliver by</Label>
              <Select id="channel" value={prefs.channel} onChange={(e) => setPrefs({ ...prefs, channel: e.target.value as NotificationPrefs["channel"] })}>
                <option value="email">Email</option>
                <option value="push">Push</option>
                <option value="both">Email and push</option>
              </Select>
            </div>
            <Button
              className="sm:ml-auto"
              disabled={!prefsDirty}
              onClick={async () => {
                if (await actions.updateNotificationPrefs(prefs)) toast("Notification preferences saved");
              }}
            >
              Save preferences
            </Button>
          </div>
        </CardBody>
      </Card>

      <AppearanceCard />
    </div>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <Card>
      <CardHeader title="Appearance" description="Applies immediately on this device." />
      <CardBody className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={mounted && theme === o.value}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition",
              mounted && theme === o.value ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2",
            )}
          >
            <o.icon className="h-5 w-5" />
            {o.label}
          </button>
        ))}
      </CardBody>
    </Card>
  );
}
