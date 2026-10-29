"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ImageIcon, PenSquare, Search, Trash2, Upload, X } from "lucide-react";
import { MediaThumb } from "@/components/media-thumb";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import type { MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Reads dimensions from a local file so uploaded media validates like the mock items. */
function probe(file: File, src: string): Promise<{ width: number; height: number; durationSec?: number }> {
  return new Promise((resolve) => {
    if (file.type.startsWith("video")) {
      const v = document.createElement("video");
      v.onloadedmetadata = () => resolve({ width: v.videoWidth, height: v.videoHeight, durationSec: Math.round(v.duration) });
      v.onerror = () => resolve({ width: 1920, height: 1080 });
      v.src = src;
    } else {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1080, height: 1080 });
      img.src = src;
    }
  });
}

export default function MediaPage() {
  const { media, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "image" | "video">("all");
  const [tag, setTag] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const tags = [...new Set(media.flatMap((m) => m.tags))].sort();
  const q = query.trim().toLowerCase();
  const list = media
    .filter((m) => type === "all" || m.type === type)
    .filter((m) => !tag || m.tags.includes(tag))
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q)));
  const opened = media.find((m) => m.id === openId) ?? null;

  async function upload(files: FileList | null) {
    if (!files?.length || !can("media.upload")) return;
    const accepted = [...files].filter((f) => f.type.startsWith("image") || f.type.startsWith("video"));
    let uploaded = 0;
    for (const file of accepted) {
      const src = URL.createObjectURL(file);
      const dims = await probe(file, src);
      const created = await actions.uploadMedia({
        name: file.name,
        type: file.type.startsWith("video") ? "video" : "image",
        sizeKb: Math.round(file.size / 1024),
        tags: ["uploaded"],
        hues: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
        src,
        ...dims,
      });
      if (created) uploaded++;
    }
    if (uploaded) toast(`Added ${uploaded} file${uploaded > 1 ? "s" : ""} (stored in this browser session only)`);
    if (accepted.length < files.length) toast("Only images and videos can be uploaded", "error");
  }

  return (
    <div
      onDragOver={(e) => {
        if (!can("media.upload")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files);
      }}
    >
      <PageHeader
        title="Media library"
        description={`${media.length} files · uploads stay in this browser session (mock storage).`}
        actions={
          <>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            <Button onClick={() => fileRef.current?.click()} disabled={!can("media.upload")} title={can("media.upload") ? undefined : "Viewers can't upload media"}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or tag" className="pl-9" aria-label="Search media" />
        </div>
        <Tabs
          value={type}
          onChange={setType}
          items={[
            { value: "all", label: "All", count: media.length },
            { value: "image", label: "Images", count: media.filter((m) => m.type === "image").length },
            { value: "video", label: "Videos", count: media.filter((m) => m.type === "video").length },
          ]}
        />
      </div>
      <div className="mb-4 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(tag === t ? null : t)}
            aria-pressed={tag === t}
            className={cn("rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition", tag === t ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground")}
          >
            #{t}
          </button>
        ))}
      </div>

      {dragging && (
        <div className="mb-4 rounded-xl border-2 border-dashed border-primary bg-primary-soft p-8 text-center text-sm text-primary">Drop files to upload</div>
      )}

      {list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((m) => (
            <button key={m.id} type="button" onClick={() => setOpenId(m.id)} className="group overflow-hidden rounded-xl border border-border bg-surface text-left">
              <MediaThumb item={m} aspect={1} className="transition group-hover:opacity-90" />
              <div className="p-2.5">
                <p className="truncate text-xs font-medium">{m.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">{m.tags.map((t) => `#${t}`).join(" ")}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<ImageIcon className="h-6 w-6" />} title="No media found" description="Try another search or tag, or upload something new." />
        </Card>
      )}

      {opened && <MediaDialog key={opened.id} item={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function MediaDialog({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const { posts, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const [newTag, setNewTag] = useState("");
  const usedIn = posts.filter((p) => p.mediaIds.includes(item.id));
  const editable = can("media.upload");

  async function addTag() {
    const t = newTag.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (!t || item.tags.includes(t)) return setNewTag("");
    await actions.updateMediaTags(item.id, [...item.tags, t]);
    setNewTag("");
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.name}
      className="sm:max-w-2xl"
      footer={
        <>
          {can("media.delete") && (
            <Button
              variant="ghost"
              className="mr-auto text-danger"
              onClick={async () => {
                if (await actions.deleteMedia(item.id)) toast("Media deleted");
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          {can("posts.create") && (
            <Link href={`/compose?media=${item.id}`} className={buttonClass()}>
              <PenSquare className="h-4 w-4" />
              Use in new post
            </Link>
          )}
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
        <MediaThumb item={item} className="max-h-[50dvh] rounded-lg" />
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted">Type</dt><dd className="capitalize">{item.type}</dd>
            <dt className="text-muted">Size</dt><dd>{item.width} × {item.height}</dd>
            <dt className="text-muted">File</dt><dd>{item.sizeKb > 1024 ? `${(item.sizeKb / 1024).toFixed(1)} MB` : `${item.sizeKb} KB`}</dd>
            {item.durationSec !== undefined && (<><dt className="text-muted">Length</dt><dd>{item.durationSec}s</dd></>)}
            <dt className="text-muted">Added</dt><dd>{format(new Date(item.createdAt), "d MMM yyyy")}</dd>
            <dt className="text-muted">Used in</dt><dd>{usedIn.length} post{usedIn.length === 1 ? "" : "s"}</dd>
          </dl>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t}>
                  #{t}
                  {editable && (
                    <button type="button" aria-label={`Remove tag ${t}`} onClick={() => actions.updateMediaTags(item.id, item.tags.filter((x) => x !== t))}>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            {editable && (
              <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); addTag(); }}>
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag" className="h-8 text-xs" aria-label="New tag" />
                <Button type="submit" size="sm" variant="outline">Add</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
