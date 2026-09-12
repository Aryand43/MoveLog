"use client";

import * as React from "react";
import { PageHeader } from "@/components/console/shell";
import { ActivityFeed } from "@/components/console/activity-feed";
import { AuditTimeline } from "@/components/console/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { moveDisplay } from "@/lib/derive";
import { useStore } from "@/lib/store";

export default function ActivityPage() {
  const { state } = useStore();
  const move = moveDisplay(state.move, state.counts);
  const tracked = state.discrepancies[state.discrepancies.length - 1];
  const decided = tracked?.status === "confirmed" || tracked?.status === "pre_existing";
  const pending = decided
    ? []
    : [
        { kind: "human", text: "Human confirmation", detail: "A coordinator confirms or dismisses the AI assessment." },
        { kind: "ops", text: "Ops notification", detail: "Posted to the ops channel once a person has decided." },
      ];

  return (
    <>
      <PageHeader
        title="Activity Log"
        description={`Every action on ${move.id}, in the order it happened.`}
        actions={<Badge variant="outline">{state.feed.length} events</Badge>}
      />

      <Tabs defaultValue="chain">
        <TabsList>
          <TabsTrigger value="chain">Audit chain</TabsTrigger>
          <TabsTrigger value="all">All activity</TabsTrigger>
        </TabsList>

        <TabsContent value="chain">
          <Card>
            <CardHeader>
              <CardTitle>Discrepancy handling, end to end</CardTitle>
              <CardDescription>
                One reported defect, from the packer&rsquo;s voice to the ops channel. Each step is recorded with who or
                what produced it, so a claim can be reconstructed later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tracked ? (
                <AuditTimeline events={tracked.timeline} pending={pending} />
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No discrepancy has been opened on this move.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All activity</CardTitle>
              <CardDescription>Newest first. Voice turns, box writes, photos, decisions and escalations.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed events={state.feed} loading={state.hydrating} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
