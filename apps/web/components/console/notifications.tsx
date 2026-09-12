"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icons } from "./icons";
import { useStore } from "@/lib/store";
import { OPS_CHANNEL, OPS_SURFACE } from "@/lib/model";

export function NotificationPanel() {
  const { state } = useStore();
  const count = state.notifications.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${count} sent to ops`}>
          <Bell className="size-4" />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
            >
              {count}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ops notifications</DialogTitle>
          <DialogDescription>
            Escalations posted to the {OPS_SURFACE} channel{" "}
            <span className="font-medium text-foreground">{OPS_CHANNEL}</span>.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {state.notifications.map((n) => (
            <li key={n.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{n.title}</p>
                <time className="tabular shrink-0 text-xs text-muted-foreground">{n.at}</time>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="info" className="gap-1">
                  <Icons.send className="size-3" aria-hidden />
                  {n.channel}
                </Badge>
                <Badge variant={n.status === "sent" ? "success" : n.status === "failed" ? "danger" : "secondary"}>
                  {n.status === "sent" ? "Delivered" : n.status === "failed" ? "Failed" : "Sending"}
                </Badge>
              </div>
            </li>
          ))}
          {count === 0 && (
            <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing escalated yet. Confirming a discrepancy posts it here.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
