"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_SECTIONS, isActive } from "./nav";
import { Logo } from "./sidebar";
import { useNavBadges } from "./use-nav-badges";

/** Phone navigation: four primary destinations in a bottom bar, the rest in a slide-up drawer. */
export function MobileNav() {
  const pathname = usePathname();
  const badges = useNavBadges();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.primary);
  const inDrawer = !primary.some((i) => isActive(pathname, i.href));

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-primary" : "text-muted")}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {count > 0 && (
                <span className="absolute top-1 left-1/2 ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", inDrawer ? "text-primary" : "text-muted")}
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1.5 text-muted hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-4">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{section.title}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {section.items.map((item) => {
                      const active = isActive(pathname, item.href);
                      const count = item.badge ? badges[item.badge] : 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                            active ? "border-primary bg-primary-soft text-primary" : "border-border",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.label}</span>
                          {count > 0 && <span className="text-xs font-semibold text-primary">{count}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
