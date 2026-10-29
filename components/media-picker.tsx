"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { cn } from "@/lib/utils";
import { MediaThumb } from "./media-thumb";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/form";

export function MediaPicker({
  open,
  onClose,
  selected,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const { media } = useStore();
  const [picked, setPicked] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const [lastOpen, setLastOpen] = useState(open);

  // Reset the working selection each time the dialog opens.
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setPicked(selected);
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? media.filter((m) => m.name.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q))) : media;
  }, [media, query]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Choose media"
      className="sm:max-w-2xl"
      footer={
        <>
          <span className="mr-auto self-center text-xs text-muted">{picked.length} selected</span>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onConfirm(picked); onClose(); }}>Use selected</Button>
        </>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or tag" className="pl-9" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {results.map((m) => {
          const index = picked.indexOf(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              aria-pressed={index >= 0}
              className={cn("relative overflow-hidden rounded-lg text-left ring-2 ring-transparent transition", index >= 0 && "ring-primary")}
            >
              <MediaThumb item={m} aspect={1} />
              <span className="block truncate px-1 py-1 text-[11px] text-muted">{m.name}</span>
              {index >= 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {picked.length > 1 ? index + 1 : <Check className="h-3 w-3" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {results.length === 0 && <p className="py-8 text-center text-sm text-muted">No media matches “{query}”.</p>}
    </Dialog>
  );
}
