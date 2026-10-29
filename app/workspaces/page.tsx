"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Crown, LogOut, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { CreateWorkspaceDialog, useCreationAllowance } from "@/components/workspace/create-workspace-dialog";
import { MyInvitations } from "@/components/workspace/my-invitations";
import { WorkspaceAvatar } from "@/components/workspace/workspace-avatar";
import { useStore } from "@/lib/data/store";
import type { MyWorkspace } from "@/lib/types";

export default function WorkspacesPage() {
  const { workspaces, activeWorkspace, switchWorkspace, session, actions } = useStore();
  const { allowed, reason } = useCreationAllowance();
  const toast = useToast();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [leaving, setLeaving] = useState<MyWorkspace | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description="Every workspace you belong to. Your role is set separately in each one."
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={!allowed} title={reason || undefined}>
            <Plus className="h-4 w-4" />
            Create workspace
          </Button>
        }
      />

      {session && (
        <p className="text-sm text-muted">
          {session.plan.name} plan · you own {session.ownedWorkspaceCount} of {session.plan.workspaceCreationLimit} workspace
          {session.plan.workspaceCreationLimit === 1 ? "" : "s"}. Joining workspaces by invitation doesn&apos;t count toward this.
        </p>
      )}

      <MyInvitations hideWhenEmpty />

      <Card>
        <CardHeader title="Your workspaces" description={`${workspaces.length} total`} />
        {workspaces.length ? (
          <ul className="divide-y divide-border">
            {workspaces.map((w) => {
              const active = w.workspace.id === activeWorkspace?.workspace.id;
              return (
                <li key={w.workspace.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <WorkspaceAvatar name={w.workspace.name} color={w.workspace.color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {w.workspace.name}
                      {w.isOwner && (
                        <Badge tone="primary">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      )}
                      {active && <Badge tone="success">Active</Badge>}
                    </p>
                    <p className="text-xs text-muted">
                      {w.role} · {w.memberCount} member{w.memberCount === 1 ? "" : "s"} · created {format(new Date(w.workspace.createdAt), "MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          switchWorkspace(w.workspace.id);
                          router.push("/");
                        }}
                      >
                        Open
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLeaving(w)}
                      disabled={w.isOwner}
                      title={w.isOwner ? "Transfer ownership from the Team page before leaving" : undefined}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Leave
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No workspaces yet" description="Create one, or accept an invitation above." />
        )}
      </Card>

      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <Dialog
        open={!!leaving}
        onClose={() => setLeaving(null)}
        title="Leave workspace?"
        footer={
          <>
            <Button variant="outline" onClick={() => setLeaving(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!leaving) return;
                const ok = await actions.leaveWorkspace(leaving.workspace.id);
                if (ok) toast(`You left ${leaving.workspace.name}`);
                setLeaving(null);
              }}
            >
              Leave
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          You&apos;ll lose access to {leaving?.workspace.name} immediately. Conversations assigned to you there become unassigned. An Admin would need to invite you again.
        </p>
      </Dialog>
    </div>
  );
}
