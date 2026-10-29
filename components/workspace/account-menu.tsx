"use client";

import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { useStore } from "@/lib/data/store";
import { rolesAtOrBelow } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { Avatar } from "../ui/avatar";
import { Label, Select } from "../ui/form";
import { Popover } from "../ui/popover";

/** The signed-in user, a role preview for the current workspace, and sign out. */
export function AccountMenu() {
  const { currentUser, actualRole, previewRole, setPreviewRole, activeWorkspace, role } = useStore();

  return (
    <Popover
      align="right"
      panelClassName="w-72"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Account menu"
          className="flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 text-xs hover:bg-surface-2"
        >
          {currentUser && <Avatar name={currentUser.name} color={currentUser.color} size={26} />}
          <span className="hidden text-left leading-tight sm:block">
            <span className="block font-medium">{currentUser?.name ?? "…"}</span>
            <span className="block text-[10px] text-muted">
              {role ?? "No workspace"}
              {previewRole && " (preview)"}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-1 p-1.5">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{currentUser?.name}</p>
            <p className="truncate text-xs text-muted">{currentUser?.email}</p>
          </div>
          {activeWorkspace && actualRole && actualRole !== "Viewer" && (
            <div className="border-t border-border px-2 pt-2.5 pb-2">
              <Label htmlFor="preview-role">Preview {activeWorkspace.workspace.name} as</Label>
              <Select id="preview-role" value={previewRole ?? ""} onChange={(e) => setPreviewRole((e.target.value || undefined) as Role | undefined)}>
                <option value="">My role ({actualRole})</option>
                {rolesAtOrBelow(actualRole)
                  .filter((r) => r !== actualRole)
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </Select>
              <p className="mt-1.5 text-[11px] text-muted">Hides controls you&apos;d lose with that role. Your real permissions don&apos;t change.</p>
            </div>
          )}
          <div className="border-t border-border pt-1">
            <Link href="/profile" onClick={close} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
              <UserRound className="h-4 w-4 text-muted" />
              Profile
            </Link>
            <form action={signOut}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
                <LogOut className="h-4 w-4 text-muted" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </Popover>
  );
}
