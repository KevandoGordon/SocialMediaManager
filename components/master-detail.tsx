"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";

/** List + detail side by side on desktop; on smaller screens the detail replaces the list with a back button. */
export function MasterDetail({
  list,
  detail,
  hasSelection,
  onBack,
  backLabel,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  hasSelection: boolean;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <Card className={cn("overflow-hidden lg:block", hasSelection && "hidden")}>{list}</Card>
      <div className={cn("min-w-0 lg:block", !hasSelection && "hidden")}>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground lg:hidden">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
        {detail}
      </div>
    </div>
  );
}
