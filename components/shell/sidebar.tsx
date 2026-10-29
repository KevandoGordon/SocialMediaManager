"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "../workspace/workspace-switcher";
import { NAV_SECTIONS, isActive } from "./nav";
import { useNavBadges } from "./use-nav-badges";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Social Connect home">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">SC</span>
      {!compact && <span className="text-sm font-semibold tracking-tight">Social Connect</span>}
    </Link>
  );
}

/** Icon rail on tablets (md), full labels on desktop (lg+). Hidden on phones, which use MobileNav. */
export function Sidebar() {
  const pathname = usePathname();
  const badges = useNavBadges();

  return (
    <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r border-border bg-surface md:flex lg:w-60">
      <div className="flex h-14 items-center justify-center border-b border-border px-3 lg:justify-start lg:px-4">
        <span className="lg:hidden">
          <Logo compact />
        </span>
        <span className="hidden lg:block">
          <Logo />
        </span>
      </div>
      <div className="flex justify-center border-b border-border p-2 lg:block">
        <span className="lg:hidden">
          <WorkspaceSwitcher variant="compact" />
        </span>
        <span className="hidden lg:block">
          <WorkspaceSwitcher />
        </span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4 lg:px-3" aria-label="Main">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 hidden px-2 text-[11px] font-semibold tracking-wider text-muted uppercase lg:block">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm transition lg:justify-start",
                        active ? "bg-primary-soft font-medium text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="hidden flex-1 lg:inline">{item.label}</span>
                      {count > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground lg:static">
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
