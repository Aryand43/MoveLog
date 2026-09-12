"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/console/shell";
import { ActivityFeed } from "@/components/console/activity-feed";
import { Icons } from "@/components/console/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { moveDisplay, roomProgress } from "@/lib/derive";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { state } = useStore();
  const { hydrating, boxes, connection, voice } = state;
  const listening = voice.status === "listening";

  const move = moveDisplay(state.move, state.counts);
  const rooms = roomProgress(boxes, state.move?.survey ?? []);
  const logged = boxes.length;
  // Progress against boxes closed, since "total" is unknown until the job ends.
  const pct = logged === 0 ? 0 : Math.round((state.counts.boxesClosed / logged) * 100);
  const blocked = connection !== "online";
  const openIssues = state.discrepancies.filter((d) => d.status === "pending" || d.status === "awaiting_photo").length;

  return (
    <>
      <PageHeader
        title={move.name}
        description={`${move.address} · ${move.date}`}
        actions={
          <>
            <Badge variant="success" className="gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-emerald-600" />
              Packing in progress
            </Badge>
            {openIssues > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/discrepancies">
                  <Icons.alert aria-hidden />
                  {openIssues} open {openIssues === 1 ? "issue" : "issues"}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* ---------------- progress ---------------- */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Progress</CardTitle>
            <span className="tabular text-sm text-muted-foreground">{pct}% complete</span>
          </CardHeader>
          <CardContent className="space-y-5">
            {hydrating ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-3xl font-semibold tracking-tight">{logged}</span>
                  <span className="text-sm text-muted-foreground">of {move.boxesTotal} boxes logged</span>
                </div>
                <Progress
                  value={pct}
                  aria-label={`${logged} of ${move.boxesTotal} boxes logged`}
                  className="h-2.5"
                />
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Rooms</p>
                  <ul className="flex flex-wrap gap-2">
                    {rooms.map((r) => (
                      <li key={r.name}>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                            r.status === "done" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                            r.status === "active" && "border-primary/30 bg-primary/10 text-primary",
                            r.status === "pending" && "border-border bg-card text-muted-foreground"
                          )}
                        >
                          {r.status === "done" && <Icons.check className="size-3.5" aria-hidden />}
                          {r.name}
                          <span className="sr-only">
                            {r.status === "done" ? ", completed" : r.status === "active" ? ", in progress" : ", not started"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t pt-4 sm:gap-3">
                  <Stat label="Fragile boxes" value={boxes.filter((b) => b.fragile).length} />
                  <Stat label="Items logged" value={boxes.reduce((n, b) => n + b.items.length, 0)} />
                  <Stat label="Photos taken" value={boxes.reduce((n, b) => n + b.photos, 0)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ---------------- voice ---------------- */}
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Voice</CardTitle>
            <Badge variant={listening ? "success" : "secondary"} className="gap-1.5">
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", listening ? "animate-pulse bg-emerald-600" : "bg-slate-400")}
              />
              {voice.status === "offline" ? "No session" : listening ? "Listening" : "Paused"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div aria-live="polite" className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Latest transcript
                </p>
                {hydrating ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <blockquote className="rounded-lg border-l-2 border-primary bg-secondary/60 px-3 py-2 text-sm">
                    {voice.transcript ? <>&ldquo;{voice.transcript}&rdquo;</> : "No packer session is connected."}
                    <footer className="tabular mt-1 text-xs text-muted-foreground">Packer · {voice.at}</footer>
                  </blockquote>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Agent</p>
                {hydrating ? (
                  <Skeleton className="h-9 w-2/3" />
                ) : (
                  <p className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                    <Icons.bot className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {voice.reply || "—"}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Button asChild className="w-full">
                <a
                  href={`/pack/${state.move?.packerToken ?? ""}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icons.mic aria-hidden />
                  Open the packer view
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                This console follows the packer&rsquo;s live session. Boxes, damage and
                decisions appear here as they are spoken.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ---------------- feed ---------------- */}
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Live activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/activity">
                Full audit log
                <Icons.chevron aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ActivityFeed events={state.feed} loading={hydrating} limit={8} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/70 px-3 py-2.5">
      <p className="tabular text-xl font-semibold tracking-tight">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
