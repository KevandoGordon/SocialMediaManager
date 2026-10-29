"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Mail } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { Button } from "../ui/button";
import { Card, CardHeader } from "../ui/card";
import { EmptyState } from "../ui/misc";
import { useToast } from "../ui/toast";
import { WorkspaceAvatar } from "./workspace-avatar";

/** Invitations addressed to the signed-in user's email. Accepting switches into the workspace. */
export function MyInvitations({ hideWhenEmpty = false }: { hideWhenEmpty?: boolean }) {
  const { myInvitations, actions, session } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (hideWhenEmpty && myInvitations.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Invitations" description={`Sent to ${session?.user.email ?? "your email"}`} />
      {myInvitations.length ? (
        <ul className="divide-y divide-border">
          {myInvitations.map(({ invitation, workspaceName, workspaceColor, invitedByName }) => (
            <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <WorkspaceAvatar name={workspaceName} color={workspaceColor} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{invitedByName}</span> invited you to <span className="font-medium">{workspaceName}</span> as{" "}
                  <span className="font-medium">{invitation.role}</span>
                </p>
                <p className="text-xs text-muted">
                  Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy === invitation.id}
                  onClick={async () => {
                    setBusy(invitation.id);
                    if (await actions.declineInvitation(invitation.id)) toast(`Declined invitation to ${workspaceName}`);
                    setBusy(null);
                  }}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  disabled={busy === invitation.id}
                  onClick={async () => {
                    setBusy(invitation.id);
                    const result = await actions.acceptInvitation(invitation.id);
                    setBusy(null);
                    if (result) {
                      toast(`Joined ${workspaceName} as ${result.role}`);
                      router.push("/");
                    }
                  }}
                >
                  Accept
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Mail className="h-6 w-6" />} title="No pending invitations" description="When someone invites your email to a workspace, it shows up here." />
      )}
    </Card>
  );
}
