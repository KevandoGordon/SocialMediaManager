import { cn } from "@/lib/utils";

export function WorkspaceAvatar({ name, color, size = 32, className }: { name: string; color: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg font-bold text-white", className)}
      style={{ background: color, width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
