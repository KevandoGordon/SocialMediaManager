"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Mail, Plus, Settings2 } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { cn } from "@/lib/utils";
import { Popover } from "../ui/popover";
import { CreateWorkspaceDialog, useCreationAllowance } from "./create-workspace-dialog";
import { WorkspaceAvatar } from "./workspace-avatar";

/**
 * `full` shows name and role (desktop sidebar, mobile header); `compact` is the avatar alone
 * (tablet icon rail).
 */
export function WorkspaceSwitcher({ variant = "full", align = "left" }: { variant?: "full" | "compact"; align?: "left" | "right" }) {
  const { workspaces, activeWorkspace, switchWorkspace, myInvitations } = useStore();
  const { allowed, reason } = useCreationAllowance();
  const [createOpen, setCreateOpen] = useState(false);
  const owned = workspaces.filter((w) => w.isOwner);
  const joined = workspaces.filter((w) => !w.isOwner);

  const label = activeWorkspace?.workspace.name ?? "No workspace";

  return (
    <>
      <Popover
        align={align}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={`Workspace: ${label}. Switch workspace`}
            className={cn(
              "flex items-center gap-2.5 rounded-lg text-left transition hover:bg-surface-2",
              variant === "full" ? "w-full p-1.5" : "p-1",
            )}
          >
            {activeWorkspace ? (
              <WorkspaceAvatar name={activeWorkspace.workspace.name} color={activeWorkspace.workspace.color} size={32} />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-border text-muted">?</span>
            )}
            {variant === "full" && (
              <>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {activeWorkspace ? `${activeWorkspace.isOwner ? "Owner · " : ""}${activeWorkspace.role}` : "Create or join one"}
                  </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
              </>
            )}
            {variant === "compact" && myInvitations.length > 0 && <span className="sr-only">{myInvitations.length} invitations</span>}
          </button>
        )}
      >
        {(close) => (
          <div role="menu" aria-label="Workspaces">
            {[
              { title: "Owned by you", list: owned },
              { title: "Member of", list: joined },
            ].map(
              (group) =>
                group.list.length > 0 && (
                  <div key={group.title} className="mb-1">
                    <p className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{group.title}</p>
                    {group.list.map((w) => {
                      const active = w.workspace.id === activeWorkspace?.workspace.id;
                      return (
                        <button
                          key={w.workspace.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            switchWorkspace(w.workspace.id);
                            close();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                        >
                          <WorkspaceAvatar name={w.workspace.name} color={w.workspace.color} size={26} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{w.workspace.name}</span>
                            <span className="block text-[11px] text-muted">
                              {w.role} · {w.memberCount} member{w.memberCount === 1 ? "" : "s"}
                            </span>
                          </span>
                          {active && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                ),
            )}
            <div className="border-t border-border pt-1">
              <button
                type="button"
                role="menuitem"
                disabled={!allowed}
                title={reason || undefined}
                onClick={() => {
                  close();
                  setCreateOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Plus className="h-4 w-4" />
                Create workspace
              </button>
              {!allowed && <p className="px-2 pb-1 text-[11px] text-muted">{reason}</p>}
              <Link
                href="/workspaces"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
              >
                {myInvitations.length ? <Mail className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                <span className="flex-1">All workspaces & invitations</span>
                {myInvitations.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{myInvitations.length}</span>
                )}
              </Link>
            </div>
          </div>
        )}
      </Popover>
      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
