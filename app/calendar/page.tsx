"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { NetworkIcon, NetworkStack } from "@/components/network-badge";
import { PostDetailDialog } from "@/components/post-detail-dialog";
import { STATUS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { NETWORKS, NETWORK_IDS } from "@/lib/networks";
import type { NetworkId, Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "month" | "week";

const HOUR_PX = 52;
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

const STATUS_BAR: Record<PostStatus, string> = {
  draft: "border-l-muted border-dashed",
  pending: "border-l-warning",
  changes_requested: "border-l-danger",
  scheduled: "border-l-primary",
  published: "border-l-success",
};

export default function CalendarPage() {
  const { posts, workspaceSettings, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const weekStartsOn = workspaceSettings!.weekStartsOn;

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [network, setNetwork] = useState<NetworkId | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const canDrag = can("posts.schedule");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const visible = useMemo(() => posts.filter((p) => network === "all" || p.networks.includes(network)), [posts, network]);
  const drafts = visible.filter((p) => !p.scheduledAt && p.status !== "published");
  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of visible) {
      if (!p.scheduledAt) continue;
      const k = dayKey(new Date(p.scheduledAt));
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    for (const list of map.values()) list.sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    return map;
  }, [visible]);

  const days =
    view === "month"
      ? eachDayOfInterval({
          start: startOfWeek(startOfMonth(cursor), { weekStartsOn }),
          end: endOfWeek(endOfMonth(cursor), { weekStartsOn }),
        })
      : eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn }), end: endOfWeek(cursor, { weekStartsOn }) });

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy")
      : `${format(days[0], "d MMM")} – ${format(days[6], "d MMM yyyy")}`;

  const step = (dir: 1 | -1) => setCursor((c) => (view === "month" ? addMonths(c, dir) : addWeeks(c, dir)));

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const post = posts.find((p) => p.id === active.id);
    if (!post) return;
    const target = String(over.id);

    if (target === "tray") {
      if (!post.scheduledAt) return;
      if (await actions.updatePost(post.id, { scheduledAt: null, status: "draft" })) toast("Moved back to drafts");
      return;
    }

    const [kind, date, hour] = target.split(":");
    const prev = post.scheduledAt ? new Date(post.scheduledAt) : null;
    const next = new Date(`${date}T00:00`);
    if (kind === "slot") next.setHours(Number(hour), prev?.getMinutes() ?? 0);
    else next.setHours(prev?.getHours() ?? 9, prev?.getMinutes() ?? 0);

    if (prev && prev.getTime() === next.getTime()) return;
    if (isBefore(next, new Date())) {
      toast("Can't schedule in the past", "error");
      return;
    }
    if (!(await actions.updatePost(post.id, { scheduledAt: next.toISOString() }))) return;
    toast(`${prev ? "Rescheduled" : "Scheduled"} for ${format(next, "EEE d MMM, HH:mm")}${post.status === "draft" ? " — open it to send for approval" : ""}`);
  }

  const activePost = posts.find((p) => p.id === activeId);
  const openPost = posts.find((p) => p.id === openId) ?? null;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={canDrag ? "Drag posts between days to reschedule, or drag a draft in to schedule it." : "Your role can view the calendar but not reschedule posts."}
      />

      <DndContext id="calendar-dnd" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" aria-label="Previous" onClick={() => step(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Next" onClick={() => step(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setCursor(new Date())}>
                  Today
                </Button>
              </div>
              <h2 className="text-base font-semibold sm:ml-2">{title}</h2>
              <div className="ml-auto flex items-center gap-2">
                <Select aria-label="Filter by network" value={network} onChange={(e) => setNetwork(e.target.value as NetworkId | "all")} className="w-auto">
                  <option value="all">All networks</option>
                  {NETWORK_IDS.map((n) => (
                    <option key={n} value={n}>{NETWORKS[n].name}</option>
                  ))}
                </Select>
                <Tabs<View> value={view} onChange={setView} items={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }]} />
              </div>
            </div>

            {view === "month" ? (
              <MonthGrid days={days} cursor={cursor} byDay={byDay} canDrag={canDrag} onOpen={setOpenId} />
            ) : (
              <WeekGrid days={days} byDay={byDay} canDrag={canDrag} onOpen={setOpenId} />
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-muted">
              {(Object.keys(STATUS) as PostStatus[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-3 w-1 rounded-full border-l-[3px]", STATUS_BAR[s])} />
                  {STATUS[s].label}
                </span>
              ))}
            </div>
          </Card>

          <DraftTray drafts={drafts} canDrag={canDrag} onOpen={setOpenId} dragging={!!activePost?.scheduledAt} />
        </div>

        <DragOverlay dropAnimation={null}>{activePost && <PostChip post={activePost} overlay />}</DragOverlay>
      </DndContext>

      <PostDetailDialog post={openPost} onClose={() => setOpenId(null)} />
    </div>
  );
}

function MonthGrid({
  days,
  cursor,
  byDay,
  canDrag,
  onOpen,
}: {
  days: Date[];
  cursor: Date;
  byDay: Map<string, Post[]>;
  canDrag: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border bg-surface-2/50 text-center text-[11px] font-medium text-muted">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} className="py-2">
            <span className="sm:hidden">{format(d, "EEEEE")}</span>
            <span className="hidden sm:inline">{format(d, "EEE")}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => (
          <DayCell key={d.toISOString()} day={d} faded={!isSameMonth(d, cursor)} posts={byDay.get(dayKey(d)) ?? []} canDrag={canDrag} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  faded,
  posts,
  canDrag,
  onOpen,
}: {
  day: Date;
  faded: boolean;
  posts: Post[];
  canDrag: boolean;
  onOpen: (id: string) => void;
}) {
  const past = isBefore(day, startOfDay(new Date()));
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dayKey(day)}`, disabled: past });
  const shown = posts.slice(0, 3);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-20 min-w-0 border-r border-b border-border p-1 transition-colors sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
        faded && "bg-surface-2/40",
        past && "bg-surface-2/60",
        isOver && "bg-primary-soft",
      )}
    >
      <div className="mb-1 flex justify-center sm:justify-start">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs",
            isToday(day) ? "bg-primary font-semibold text-primary-foreground" : faded ? "text-muted/60" : "text-muted",
          )}
        >
          {format(day, "d")}
        </span>
      </div>
      <div className="space-y-1">
        {shown.map((p) => (
          <DraggablePost key={p.id} post={p} canDrag={canDrag} onOpen={onOpen} compact />
        ))}
        {posts.length > shown.length && (
          <button type="button" onClick={() => onOpen(posts[3].id)} className="w-full text-left text-[11px] text-muted hover:text-foreground">
            +{posts.length - shown.length} more
          </button>
        )}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  byDay,
  canDrag,
  onOpen,
}: {
  days: Date[];
  byDay: Map<string, Post[]>;
  canDrag: boolean;
  onOpen: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_PX - 10;
  }, []);
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-border text-center text-xs">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="py-2">
              <p className="text-muted">{format(d, "EEE")}</p>
              <p className={cn("mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", isToday(d) && "bg-primary text-primary-foreground")}>
                {format(d, "d")}
              </p>
            </div>
          ))}
        </div>
        <div ref={scrollRef} className="h-[560px] overflow-y-auto">
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">
            {hours.map((h) => (
              <div key={h} className="contents">
                <div className="relative border-r border-border pr-2 text-right text-[10px] text-muted" style={{ height: HOUR_PX }}>
                  <span className="relative -top-1.5">{h === 0 ? "" : format(new Date(2000, 0, 1, h), "HH:mm")}</span>
                </div>
                {days.map((d) => (
                  <HourSlot
                    key={d.toISOString()}
                    day={d}
                    hour={h}
                    posts={(byDay.get(dayKey(d)) ?? []).filter((p) => new Date(p.scheduledAt!).getHours() === h)}
                    canDrag={canDrag}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HourSlot({
  day,
  hour,
  posts,
  canDrag,
  onOpen,
}: {
  day: Date;
  hour: number;
  posts: Post[];
  canDrag: boolean;
  onOpen: (id: string) => void;
}) {
  const end = new Date(day);
  end.setHours(hour + 1, 0, 0, 0);
  const past = isBefore(end, new Date());
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${dayKey(day)}:${hour}`, disabled: past });
  return (
    <div
      ref={setNodeRef}
      style={{ minHeight: HOUR_PX }}
      className={cn("min-w-0 space-y-1 border-r border-b border-border p-0.5 last:border-r-0", past && "bg-surface-2/50", isOver && "bg-primary-soft")}
    >
      {posts.map((p) => (
        <DraggablePost key={p.id} post={p} canDrag={canDrag} onOpen={onOpen} />
      ))}
    </div>
  );
}

function DraftTray({ drafts, canDrag, onOpen, dragging }: { drafts: Post[]; canDrag: boolean; onOpen: (id: string) => void; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });
  return (
    <Card className={cn("self-start lg:sticky lg:top-20", isOver && "ring-2 ring-primary")}>
      <CardHeader title="Unscheduled drafts" description={canDrag ? "Drag onto a day to schedule" : undefined} />
      <div ref={setNodeRef} className="flex gap-2 overflow-x-auto p-3 lg:max-h-[60vh] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
        {drafts.map((p) => (
          <div key={p.id} className="w-56 shrink-0 lg:w-auto">
            <DraggablePost post={p} canDrag={canDrag} onOpen={onOpen} />
          </div>
        ))}
        {drafts.length === 0 && (
          <p className="w-full py-6 text-center text-xs text-muted">{dragging ? "Drop here to unschedule" : "No unscheduled drafts"}</p>
        )}
      </div>
    </Card>
  );
}

function DraggablePost({ post, canDrag, onOpen, compact }: { post: Post; canDrag: boolean; onOpen: (id: string) => void; compact?: boolean }) {
  const draggable = canDrag && post.status !== "published";
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: post.id, disabled: !draggable });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      <PostChip
        post={post}
        compact={compact}
        draggable={draggable}
        onClick={() => onOpen(post.id)}
        handleProps={draggable ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

function PostChip({
  post,
  compact,
  overlay,
  draggable,
  onClick,
  handleProps,
}: {
  post: Post;
  compact?: boolean;
  overlay?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  handleProps?: React.HTMLAttributes<HTMLElement>;
}) {
  const time = post.scheduledAt ? format(new Date(post.scheduledAt), "HH:mm") : null;
  return (
    <div
      {...handleProps}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick?.();
        handleProps?.onKeyDown?.(e);
      }}
      aria-label={`${STATUS[post.status].label}${time ? ` at ${time}` : ""}: ${post.content.slice(0, 60)}`}
      className={cn(
        "group flex min-w-0 touch-manipulation items-start gap-1 rounded-md border border-l-[3px] border-border bg-surface px-1.5 py-1 text-left text-[11px] leading-tight shadow-xs select-none hover:bg-surface-2",
        STATUS_BAR[post.status],
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        overlay && "w-56 cursor-grabbing shadow-lg ring-2 ring-primary",
        post.status === "published" && "opacity-75",
      )}
    >
      {draggable && !compact && <GripVertical className="mt-px h-3 w-3 shrink-0 text-muted" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {compact ? (
            <NetworkIcon network={post.networks[0]} size={12} className="rounded-sm" />
          ) : (
            <NetworkStack networks={post.networks} size={14} />
          )}
          {time && <span className={cn("font-medium tabular-nums", compact && "hidden sm:inline")}>{time}</span>}
        </div>
        <p className={cn("mt-0.5 truncate text-muted", compact && "hidden sm:block")}>{post.content}</p>
      </div>
    </div>
  );
}
