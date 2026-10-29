"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Check, Crown, LogOut, Minus, RotateCw, Trash2, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/form";
import { PageHeader, PermissionNote } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import {
  OWNER_NOTE,
  PERMISSIONS,
  PERMISSION_GROUPS,
  ROLES,
  ROLE_DESCRIPTIONS,
  assignableRoles,
  type Permission,
} from "@/lib/permissions";
import type { InvitationStatus, Member, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const INVITE_STATUS: Record<InvitationStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "neutral" },
  revoked: { label: "Revoked", tone: "neutral" },
  expired: { label: "Expired", tone: "danger" },
};

export default function TeamPage() {
  const { members, invitations, role, currentUser, activeWorkspace, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteFilter, setInviteFilter] = useState<"pending" | "history">("pending");
  const [confirm, setConfirm] = useState<{ kind: "remove" | "transfer" | "leave"; member?: Member } | null>(null);

  const workspaceName = activeWorkspace!.workspace.name;
  const isOwner = activeWorkspace!.isOwner;
  const admins = members.filter((m) => m.role === "Admin");
  const grantable = assignableRoles(role);
  const visibleInvites = invitations.filter((i) => (inviteFilter === "pending" ? i.status === "pending" || i.status === "expired" : i.status !== "pending" && i.status !== "expired"));

  async function confirmAction() {
    if (!confirm) return;
    const { kind, member } = confirm;
    setConfirm(null);
    if (kind === "remove" && member && (await actions.removeMember(member.id))) toast(`${member.name} removed from ${workspaceName}`);
    if (kind === "transfer" && member && (await actions.transferOwnership(member.id))) toast(`${member.name} now owns ${workspaceName}`);
    if (kind === "leave" && (await actions.leaveWorkspace(activeWorkspace!.workspace.id))) {
      toast(`You left ${workspaceName}`);
      router.push("/");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`Members of ${workspaceName} and what each role can do here.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirm({ kind: "leave" })} disabled={isOwner} title={isOwner ? "Transfer ownership before leaving" : undefined}>
              <LogOut className="h-4 w-4" />
              Leave
            </Button>
            {can("members.invite") && (
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            )}
          </>
        }
      />
      {!can("members.invite") && <PermissionNote>Only Admins and Managers can invite people. Only Admins can change roles or remove members.</PermissionNote>}

      <Card>
        <CardHeader title="Members" description={`${members.length} ${members.length === 1 ? "person" : "people"} · ${admins.length} Admin${admins.length === 1 ? "" : "s"}`} />
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const isMe = m.id === currentUser?.id;
            const lastAdmin = m.role === "Admin" && admins.length === 1;
            const roleLocked = m.isOwner || lastAdmin;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={m.name} color={m.color} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{m.name}</span>
                    {isMe && <Badge tone="primary">You</Badge>}
                    {m.isOwner && (
                      <Badge tone="warning">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{m.email} · joined {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}</p>
                </div>
                <div className="flex items-center gap-1">
                  {can("members.update_role") && !isMe && !roleLocked ? (
                    <Select
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      onChange={async (e) => {
                        if (await actions.updateMemberRole(m.id, e.target.value as Role)) toast(`${m.name} is now ${e.target.value} in ${workspaceName}`);
                      }}
                      className="h-8 w-28 text-xs"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  ) : (
                    <Badge className="w-28 justify-center" title={m.isOwner ? OWNER_NOTE : lastAdmin ? "A workspace needs at least one Admin" : undefined}>
                      {m.role}
                    </Badge>
                  )}
                  {isOwner && !isMe && m.role === "Admin" && (
                    <Button variant="ghost" size="icon" aria-label={`Transfer ownership to ${m.name}`} title="Transfer ownership" onClick={() => setConfirm({ kind: "transfer", member: m })}>
                      <Crown className="h-4 w-4 text-muted" />
                    </Button>
                  )}
                  {can("members.remove") && !isMe && !m.isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${m.name}`}
                      disabled={lastAdmin}
                      onClick={() => setConfirm({ kind: "remove", member: m })}
                    >
                      <Trash2 className="h-4 w-4 text-muted" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted sm:px-5">{OWNER_NOTE}</p>
      </Card>

      {can("invitations.view") && (
        <Card>
          <CardHeader
            title="Invitations"
            description="No email is sent yet. Invitees see invitations under Workspaces when they sign in with that email."
            action={
              <Tabs
                value={inviteFilter}
                onChange={setInviteFilter}
                items={[
                  { value: "pending", label: "Open", count: invitations.filter((i) => i.status === "pending" || i.status === "expired").length },
                  { value: "history", label: "History" },
                ]}
              />
            }
          />
          {visibleInvites.length ? (
            <ul className="divide-y divide-border">
              {visibleInvites.map((inv) => {
                const manageable = grantable.includes(inv.role);
                const inviter = members.find((m) => m.id === inv.invitedByUserId);
                return (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="truncate font-medium">{inv.email}</span>
                        <Badge>{inv.role}</Badge>
                        <Badge tone={INVITE_STATUS[inv.status].tone}>{INVITE_STATUS[inv.status].label}</Badge>
                      </p>
                      <p className="text-xs text-muted">
                        Invited by {inviter?.name ?? "a former member"} {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                        {inv.status === "pending" && ` · expires ${formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}`}
                        {inv.sendCount > 1 && ` · renewed ${inv.sendCount - 1}×`}
                      </p>
                    </div>
                    {manageable && (inv.status === "pending" || inv.status === "expired") && (
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (await actions.resendInvitation(inv.id)) toast(`Invitation renewed for 7 days (no email sent)`);
                          }}
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          {inv.status === "expired" ? "Renew" : "Resend"}
                        </Button>
                        {inv.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (await actions.revokeInvitation(inv.id)) toast(`Invitation to ${inv.email} revoked`);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">{inviteFilter === "pending" ? "No open invitations." : "No past invitations."}</p>
          )}
        </Card>
      )}

      <PermissionMatrix />

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} grantable={grantable} />

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "remove" ? "Remove member?" : confirm?.kind === "transfer" ? "Transfer ownership?" : "Leave workspace?"}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm?.kind === "transfer" ? "primary" : "danger"} onClick={confirmAction}>
              {confirm?.kind === "remove" ? "Remove" : confirm?.kind === "transfer" ? "Transfer" : "Leave"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {confirm?.kind === "remove" &&
            `${confirm.member?.name} will lose access to ${workspaceName} immediately. Their conversations become unassigned; their posts stay.`}
          {confirm?.kind === "transfer" &&
            `${confirm.member?.name} becomes the owner of ${workspaceName} and it counts toward their plan's workspace limit instead of yours. You stay an Admin. This needs ${confirm.member?.name.split(" ")[0]} to have room under their plan.`}
          {confirm?.kind === "leave" && `You'll lose access to ${workspaceName} immediately. An Admin would need to invite you again.`}
        </p>
      </Dialog>
    </div>
  );
}

function InviteDialog({ open, onClose, grantable }: { open: boolean; onClose: () => void; grantable: Role[] }) {
  const { actions, activeWorkspace } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Editor");
  const [busy, setBusy] = useState(false);
  const chosen = grantable.includes(role) ? role : grantable[grantable.length - 1];

  async function submit() {
    setBusy(true);
    const result = await actions.inviteMember(email, chosen);
    setBusy(false);
    if (!result) return;
    toast(
      result.accountExists
        ? `Invitation recorded. ${result.invitation.email} will see it under Workspaces (no email sent).`
        : `Invitation recorded. No account uses ${result.invitation.email} yet; it'll be waiting when they sign up with it (no email sent).`,
    );
    setEmail("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Invite to ${activeWorkspace?.workspace.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !email.trim()}>{busy ? "Inviting…" : "Create invitation"}</Button>
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
        <div>
          <Label htmlFor="inv-email">Email</Label>
          <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />
        </div>
        <div>
          <Label htmlFor="inv-role">Role in this workspace</Label>
          <Select id="inv-role" value={chosen} onChange={(e) => setRole(e.target.value as Role)}>
            {grantable.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <p className="mt-1.5 text-xs text-muted">{ROLE_DESCRIPTIONS[chosen]}</p>
          {grantable.length < ROLES.length && <p className="mt-1 text-xs text-muted">Managers can invite Editors and Viewers.</p>}
        </div>
        <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
          No email is sent yet. The invitation is valid for 7 days and appears for anyone signed in with this address.
        </p>
      </form>
    </Dialog>
  );
}

function PermissionMatrix() {
  const { role } = useStore();
  return (
    <Card>
      <CardHeader title="Roles & permissions" description="The same for every workspace; your column here is highlighted. Your role in other workspaces doesn't apply." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className={cn("w-20 px-3 py-3 text-center text-xs font-semibold", r === role && "bg-primary-soft text-primary")} title={ROLE_DESCRIPTIONS[r]}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          {PERMISSION_GROUPS.map((group) => (
            <tbody key={group} className="divide-y divide-border border-b border-border">
              <tr>
                <th colSpan={5} className="bg-surface-2/60 px-5 py-1.5 text-left text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {group}
                </th>
              </tr>
              {(Object.keys(PERMISSIONS) as Permission[])
                .filter((p) => PERMISSIONS[p].group === group)
                .map((p) => (
                  <tr key={p}>
                    <td className="px-5 py-2">{PERMISSIONS[p].label}</td>
                    {ROLES.map((r) => (
                      <td key={r} className={cn("px-3 py-2 text-center", r === role && "bg-primary-soft")}>
                        {(PERMISSIONS[p].roles as Role[]).includes(r) ? (
                          <Check className="mx-auto h-4 w-4 text-success" aria-label="Allowed" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-muted/50" aria-label="Not allowed" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          ))}
        </table>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r}>
            <p className="text-sm font-medium">{r}</p>
            <p className="mt-0.5 text-xs text-muted">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
