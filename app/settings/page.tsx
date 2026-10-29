"use client";

import { useState } from "react";
import { NetworkIcon } from "@/components/network-badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, Switch } from "@/components/ui/form";
import { PageHeader, PermissionNote } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { NETWORKS, NETWORK_IDS } from "@/lib/networks";
import type { WorkspaceSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIMEZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "Europe/London", "Europe/Berlin", "Asia/Singapore", "Australia/Sydney"];

/** Workspace-level settings. Profile and notifications are account-level and live on /profile. */
export default function WorkspaceSettingsPage() {
  const { activeWorkspace, workspaceSettings, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const editable = can("workspace.settings.update");
  const [name, setName] = useState(activeWorkspace!.workspace.name);
  const [draft, setDraft] = useState<WorkspaceSettings>(workspaceSettings!);
  const timezones = TIMEZONES.includes(draft.timezone) ? TIMEZONES : [draft.timezone, ...TIMEZONES];

  const nameDirty = name.trim() !== activeWorkspace!.workspace.name;
  const settingsDirty = JSON.stringify(draft) !== JSON.stringify(workspaceSettings);
  const set = (patch: Partial<WorkspaceSettings>) => setDraft((d) => ({ ...d, ...patch }));

  async function save() {
    let ok = true;
    if (nameDirty) ok = !!(await actions.renameWorkspace(name));
    if (ok && settingsDirty) ok = !!(await actions.updateWorkspaceSettings(draft));
    if (ok) toast("Workspace settings saved");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Workspace settings" description={`Applies to everyone in ${activeWorkspace!.workspace.name}.`} />
      {!editable && <PermissionNote>Only Admins can change workspace settings. Your profile and notifications are on the Profile page.</PermissionNote>}

      <Card>
        <CardHeader title="General" />
        <CardBody>
          <fieldset disabled={!editable} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
              </div>
              <div>
                <Label htmlFor="tz">Time zone</Label>
                <Select id="tz" value={draft.timezone} onChange={(e) => set({ timezone: e.target.value })}>
                  {timezones.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="week">Week starts on</Label>
                <Select id="week" value={draft.weekStartsOn} onChange={(e) => set({ weekStartsOn: Number(e.target.value) as 0 | 1 })}>
                  <option value={1}>Monday</option>
                  <option value={0}>Sunday</option>
                </Select>
              </div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Require approval</p>
                <p className="text-xs text-muted">Posts by Editors must be approved by a Manager or Admin before they&apos;re scheduled.</p>
              </div>
              <Switch label="Require approval" checked={draft.requireApproval} disabled={!editable} onChange={(v) => set({ requireApproval: v })} />
            </div>
            <div>
              <p className="text-sm font-medium">Default networks</p>
              <p className="mb-2 text-xs text-muted">Pre-selected when someone starts a new post.</p>
              <div className="flex flex-wrap gap-2">
                {NETWORK_IDS.map((n) => {
                  const on = draft.defaultNetworks.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ defaultNetworks: on ? draft.defaultNetworks.filter((x) => x !== n) : [...draft.defaultNetworks, n] })}
                      className={cn("inline-flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50", on ? "border-primary bg-primary-soft" : "border-border")}
                    >
                      <NetworkIcon network={n} size={18} className="rounded-full" decorative />
                      {NETWORKS[n].name}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>
        </CardBody>
      </Card>

      {editable && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!nameDirty && !settingsDirty}
            onClick={() => {
              setName(activeWorkspace!.workspace.name);
              setDraft(workspaceSettings!);
            }}
          >
            Discard
          </Button>
          <Button disabled={!nameDirty && !settingsDirty} onClick={save}>Save changes</Button>
        </div>
      )}
    </div>
  );
}
