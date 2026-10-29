"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useStore } from "@/lib/data/store";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/form";

export interface ThreadEntry {
  id: string;
  authorId?: string;
  /** For external authors (e.g. customers) who aren't team members. */
  authorName?: string;
  body: string;
  createdAt: string;
}

export function CommentThread({
  entries,
  onSubmit,
  canPost,
  placeholder,
  submitLabel = "Comment",
  disabledNote,
}: {
  entries: ThreadEntry[];
  /** Return false to keep the draft (e.g. the server rejected it). */
  onSubmit: (body: string) => Promise<boolean | void> | boolean | void;
  canPost: boolean;
  placeholder: string;
  submitLabel?: string;
  disabledNote?: string;
}) {
  const { members } = useStore();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!draft.trim()) return;
    setBusy(true);
    const ok = await onSubmit(draft.trim());
    if (ok !== false) setDraft("");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {entries.length > 0 && (
        <ul className="space-y-3">
          {entries.map((e) => {
            const user = members.find((u) => u.id === e.authorId);
            const name = user?.name ?? e.authorName ?? "Former member";
            return (
              <li key={e.id} className="flex gap-2.5">
                <Avatar name={name} color={user?.color} size={28} />
                <div className="min-w-0 flex-1 rounded-lg bg-surface-2 px-3 py-2">
                  <p className="text-xs">
                    <span className="font-medium">{name}</span>
                    {user && <span className="text-muted"> · {user.role}</span>}
                    <span className="text-muted"> · {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</span>
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{e.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canPost ? (
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder={placeholder}
            aria-label={placeholder}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={!draft.trim() || busy}>
              {submitLabel}
            </Button>
          </div>
        </div>
      ) : (
        disabledNote && <p className="text-xs text-muted">{disabledNote}</p>
      )}
    </div>
  );
}
