import { Play } from "lucide-react";
import type { MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Renders an uploaded file, or a generated gradient placeholder for mock media. */
export function MediaThumb({
  item,
  aspect,
  className,
  showType = true,
}: {
  item: MediaItem;
  /** Force a crop (width / height). Defaults to the file's own ratio. */
  aspect?: number;
  className?: string;
  showType?: boolean;
}) {
  const [a, b] = item.hues;
  return (
    <div
      className={cn("relative overflow-hidden bg-surface-2", className)}
      style={{ aspectRatio: aspect ?? item.width / item.height }}
    >
      {item.src && item.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.src} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : item.src && item.type === "video" ? (
        <video src={item.src} muted className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          role="img"
          aria-label={item.name}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 25%, hsl(${a} 85% 72%), transparent 55%),
              radial-gradient(circle at 75% 80%, hsl(${b} 80% 60%), transparent 60%),
              linear-gradient(135deg, hsl(${a} 60% 45%), hsl(${b} 65% 35%))`,
          }}
        />
      )}
      {showType && item.type === "video" && (
        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Play className="h-2.5 w-2.5 fill-current" />
          {item.durationSec ? `${Math.floor(item.durationSec / 60)}:${String(item.durationSec % 60).padStart(2, "0")}` : "Video"}
        </span>
      )}
    </div>
  );
}
