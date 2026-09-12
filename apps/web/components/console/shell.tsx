"use client";

import * as React from "react";
import { SidebarNav } from "./sidebar";
import { TopBar, ConnectionAlertSlot } from "./topbar";
import { Toaster } from "./toaster";
import { StoreProvider } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <TooltipProvider delayDuration={250}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen bg-page">
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-sidebar text-sidebar-foreground lg:block">
            <SidebarNav />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <ConnectionAlertSlot />
            <main id="main" className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </StoreProvider>
  );
}

/** Shared page heading. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
