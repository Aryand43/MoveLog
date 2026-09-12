import { kindStyle } from "./icons";
import type { FeedEvent } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

/**
 * The audit trail: voice input → item logged → photo requested → AI assessment
 * → human confirmation → ops notification. Rendered as an ordered list so it
 * reads correctly with a screen reader.
 */
export function AuditTimeline({
  events,
  pending = [],
  className,
}: {
  events: FeedEvent[];
  /** Steps not reached yet. Drawn dashed so the whole chain is legible up front. */
  pending?: { kind: string; text: string; detail: string }[];
  className?: string;
}) {
  const total = events.length + pending.length;
  return (
    <ol className={cn("relative space-y-0", className)}>
      {events.map((e, i) => {
        const { Icon, ring } = kindStyle(e.kind);
        const last = i === total - 1;
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" />}
            <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full border", ring)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-medium">{e.text}</p>
                <time className="tabular text-xs text-muted-foreground">{e.at}</time>
              </div>
              {e.detail && <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>}
            </div>
          </li>
        );
      })}

      {pending.map((s, i) => {
        const { Icon } = kindStyle(s.kind);
        const last = events.length + i === total - 1;
        return (
          <li key={`pending-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px border-l border-dashed border-border"
              />
            )}
            <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-medium text-muted-foreground">{s.text}</p>
                <span className="rounded-full border border-dashed px-1.5 py-px text-[10px] uppercase tracking-wider text-muted-foreground">
                  Not yet
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
