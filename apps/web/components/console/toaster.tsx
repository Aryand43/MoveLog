"use client";

import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Single-slot toast. Announced politely so a screen-reader user hears the
 * outcome of a button press without the focus moving.
 */
export function Toaster() {
  const { state } = useStore();
  const t = state.toast;
  const Icon = t?.tone === "success" ? CheckCircle2 : t?.tone === "warning" ? AlertTriangle : Info;

  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      {t && (
        <div
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2",
            t.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
            t.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
            t.tone === "default" && "border-border bg-card text-foreground"
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {t.text}
        </div>
      )}
    </div>
  );
}
