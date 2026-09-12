"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Icons } from "./icons";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { moveDisplay } from "@/lib/derive";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Active Move", icon: Icons.dashboard },
  { href: "/manifest", label: "Manifest", icon: Icons.boxes },
  { href: "/discrepancies", label: "Discrepancies", icon: Icons.alert },
  { href: "/activity", label: "Activity Log", icon: Icons.log },
  { href: "/settings", label: "Settings", icon: Icons.settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state } = useStore();
  const move = moveDisplay(state.move, state.counts);
  const open = state.discrepancies.filter((d) => d.status === "pending" || d.status === "awaiting_photo").length;

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-emerald-500 text-[#06281f]">
          <Icons.boxes className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">MoveLog</p>
          <p className="truncate text-xs text-sidebar-muted">Hands-free packing log</p>
        </div>
      </div>

      <ul className="space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)]"
                    : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                {href === "/discrepancies" && open > 0 && (
                  <Badge variant="warning" className="border-amber-300/30 bg-amber-400/20 px-1.5 py-0 text-[11px] text-amber-200">
                    {open}
                    <span className="sr-only"> open discrepancies</span>
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto p-3">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-hover p-3">
          <p className="text-xs text-sidebar-muted">Active move</p>
          <p className="mt-0.5 truncate text-sm font-medium text-sidebar-foreground">{move.name}</p>
          <p className="tabular text-xs text-sidebar-muted">{move.id}</p>
        </div>
      </div>
    </nav>
  );
}
