import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

/** Segmented control; scrolls horizontally on narrow screens instead of wrapping. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("-mx-1 overflow-x-auto px-1", className)}>
      <div role="tablist" className="inline-flex gap-1 rounded-lg bg-surface-2 p-1">
        {items.map((item) => (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={value === item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
              value === item.value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-surface-2 px-1.5 text-[10px] text-muted">{item.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
