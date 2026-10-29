"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { StoreProvider, useStore } from "@/lib/data/store";
import { PageSkeleton } from "../ui/misc";
import { ToastProvider } from "../ui/toast";
import { NoWorkspace } from "../workspace/no-workspace";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { NAV_ITEMS, isActive } from "./nav";
import { Sidebar } from "./sidebar";

function Content({ children }: { children: React.ReactNode }) {
  const { sessionLoading, activeWorkspace, workspaceLoading } = useStore();
  const pathname = usePathname();
  const accountPage = NAV_ITEMS.some((i) => i.account && isActive(pathname, i.href));

  let body: React.ReactNode;
  if (sessionLoading) body = <PageSkeleton />;
  else if (accountPage) body = children;
  else if (!activeWorkspace) body = <NoWorkspace />;
  else if (workspaceLoading) body = <PageSkeleton />;
  // Keyed by workspace so every page's local state (selection, filters, open dialogs) resets on switch.
  else body = <div key={activeWorkspace.workspace.id}>{children}</div>;

  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-24 sm:px-6 sm:pt-6 md:pb-10">{body}</main>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <StoreProvider>
          <div className="flex min-h-dvh">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Header />
              <Content>{children}</Content>
            </div>
          </div>
          <MobileNav />
        </StoreProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
