"use client";

import { useState } from "react";
import { Layers, Plus } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/misc";
import { CreateWorkspaceDialog, useCreationAllowance } from "./create-workspace-dialog";
import { MyInvitations } from "./my-invitations";

/** Shown on workspace pages when the signed-in user belongs to no workspace. */
export function NoWorkspace() {
  const { currentUser } = useStore();
  const { allowed, reason } = useCreationAllowance();
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title={`Welcome${currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}`}
          description="You're not in a workspace yet. Accept an invitation below, or create your own workspace to start planning content."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => setOpen(true)} disabled={!allowed}>
                <Plus className="h-4 w-4" />
                Create workspace
              </Button>
              {!allowed && <p className="text-xs text-muted">{reason}</p>}
            </div>
          }
        />
      </Card>
      <MyInvitations />
      <CreateWorkspaceDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
