"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/data/store";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input, Label } from "../ui/form";
import { useToast } from "../ui/toast";

export function useCreationAllowance() {
  const { session } = useStore();
  if (!session) return { allowed: false, reason: "" };
  const { plan, ownedWorkspaceCount } = session;
  const allowed = ownedWorkspaceCount < plan.workspaceCreationLimit;
  return {
    allowed,
    reason: allowed
      ? ""
      : `Your ${plan.name} plan includes ${plan.workspaceCreationLimit} owned workspace and you're using it. You can still join others by invitation.`,
  };
}

export function CreateWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useStore();
  const { allowed, reason } = useCreationAllowance();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    const created = await actions.createWorkspace(name);
    setBusy(false);
    if (!created) return;
    toast(`Created ${created.name}`);
    setName("");
    onClose();
    router.push("/");
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create a workspace"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !allowed || name.trim().length < 2}>
            {busy ? "Creating…" : "Create workspace"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="text-sm text-muted">
          A workspace is a separate environment for one brand, client or team, with its own accounts, posts, members and settings. You&apos;ll be its owner and an Admin.
        </p>
        {!allowed && <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{reason}</p>}
        <div>
          <Label htmlFor="ws-new-name">Workspace name</Label>
          <Input id="ws-new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Co." maxLength={50} disabled={!allowed} autoFocus />
        </div>
      </form>
    </Dialog>
  );
}
