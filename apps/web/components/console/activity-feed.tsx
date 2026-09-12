import { kindStyle } from "./icons";
import type { FeedEvent } from "@/lib/demo-data";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ActivityFeed({
  events,
  loading,
  limit,
  className,
}: {
  events: FeedEvent[];
  loading?: boolean;
  limit?: number;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex-1 space-y-1.5 py-1">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const shown = limit ? events.slice(0, limit) : events;

  if (shown.length === 0) {
    return (
      <p className={cn("rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground", className)}>
        No activity yet. Press <span className="font-medium text-foreground">Push to talk</span> to log the first box.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-1", className)} aria-live="polite">
      {shown.map((e) => {
        const { Icon, ring } = kindStyle(e.kind);
        return (
          <li key={e.id} className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/60">
            <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border", ring)}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{e.text}</p>
                <time className="tabular shrink-0 text-xs text-muted-foreground">{e.at}</time>
              </div>
              {e.detail && <p className="truncate text-sm text-muted-foreground">{e.detail}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
