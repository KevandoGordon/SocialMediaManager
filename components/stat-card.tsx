import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  /** Fractional change vs. previous period, e.g. 0.12 for +12%. */
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {delta !== undefined && (
          <span className={cn("inline-flex items-center font-medium", up ? "text-success" : "text-danger")}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </div>
    </Card>
  );
}
