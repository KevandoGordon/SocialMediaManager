"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenSquare } from "lucide-react";
import { useCan, useStore } from "@/lib/data/store";
import { buttonClass } from "../ui/button";
import { DemoMenu } from "../workspace/demo-menu";
import { WorkspaceSwitcher } from "../workspace/workspace-switcher";
import { NAV_ITEMS, isActive } from "./nav";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const pathname = usePathname();
  const { activeWorkspace } = useStore();
  const can = useCan();
  const page = NAV_ITEMS.find((i) => isActive(pathname, i.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
      <div className="min-w-0 flex-1 md:hidden">
        <div className="max-w-56">
          <WorkspaceSwitcher />
        </div>
      </div>
      <p className="hidden min-w-0 flex-1 truncate text-sm font-medium md:block">{page?.label}</p>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        {activeWorkspace && can("posts.create") && pathname !== "/compose" && (
          <Link href="/compose" className={buttonClass({ size: "sm", className: "hidden sm:inline-flex" })}>
            <PenSquare className="h-3.5 w-3.5" />
            New post
          </Link>
        )}
        <DemoMenu />
      </div>
    </header>
  );
}
