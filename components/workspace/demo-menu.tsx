"use client";

import { ChevronDown, FlaskConical } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { rolesAtOrBelow } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { Avatar } from "../ui/avatar";
import { Label, Select } from "../ui/form";
import { Popover } from "../ui/popover";

/**
 * Demo controls, clearly separated from real product UI: pick which seeded account you are
 * (simulated sign-in, no authentication) and optionally preview a lower role in this workspace.
 */
export function DemoMenu() {
  const { demoUsers, currentUser, signInAs, actualRole, previewRole, setPreviewRole, activeWorkspace, role } = useStore();

  return (
    <Popover
      align="right"
      panelClassName="w-80"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Demo identity and role preview"
          className="flex h-9 items-center gap-2 rounded-lg border border-dashed border-warning/60 bg-warning-soft/40 pr-2 pl-1 text-xs hover:bg-warning-soft"
        >
          {currentUser && <Avatar name={currentUser.name} color={currentUser.color} size={26} />}
          <span className="hidden text-left leading-tight sm:block">
            <span className="block font-medium">{currentUser?.name ?? "…"}</span>
            <span className="block text-[10px] text-muted">
              Demo · {role ?? "no workspace"}
              {previewRole && " (preview)"}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-3 p-2">
          <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-2.5 py-2 text-[11px] text-warning">
            <FlaskConical className="mt-px h-3.5 w-3.5 shrink-0" />
            Demo mode: there is no real sign-in. Pick a seeded account to see the app as them. Data is in memory and resets on reload.
          </p>
          <div>
            <Label htmlFor="demo-user">Signed in as</Label>
            <Select
              id="demo-user"
              value={currentUser?.id ?? ""}
              onChange={(e) => {
                signInAs(e.target.value);
                close();
              }}
            >
              {demoUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </Select>
          </div>
          {activeWorkspace && actualRole && (
            <div>
              <Label htmlFor="demo-role">Preview permissions in {activeWorkspace.workspace.name}</Label>
              <Select
                id="demo-role"
                value={previewRole ?? ""}
                onChange={(e) => setPreviewRole((e.target.value || undefined) as Role | undefined)}
              >
                <option value="">Actual role ({actualRole})</option>
                {rolesAtOrBelow(actualRole)
                  .filter((r) => r !== actualRole)
                  .map((r) => (
                    <option key={r} value={r}>
                      Preview as {r}
                    </option>
                  ))}
              </Select>
              <p className="mt-1.5 text-[11px] text-muted">
                Only hides controls in this workspace and can&apos;t go above your real role. The API still checks your actual role.
              </p>
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}
