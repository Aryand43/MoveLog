"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { Icons } from "./icons";
import { SidebarNav } from "./sidebar";
import { NotificationPanel } from "./notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { moveDisplay } from "@/lib/derive";

export function TopBar() {
  const { state, dispatch } = useStore();
  const move = moveDisplay(state.move, state.counts);
  const [menu, setMenu] = React.useState(false);
  const online = state.connection === "online";

  const cycle = () =>
    dispatch({
      type: "connection",
      value: state.connection === "online" ? "offline" : state.connection === "offline" ? "reconnecting" : "online",
    });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu />
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none rounded-r-xl border-0 bg-sidebar p-0 text-sidebar-foreground">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarNav onNavigate={() => setMenu(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 items-baseline gap-2">
        <span className="tabular text-sm font-semibold">{move.id}</span>
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">{move.name}</span>
      </div>

      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      <label className="hidden items-center gap-2 sm:flex">
        <span className="text-xs text-muted-foreground">Move</span>
        <select
          aria-label="Select move"
          value={state.moveId}
          onChange={(e) => dispatch({ type: "move/select", id: e.target.value })}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          {state.moves.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id} — {m.customer}
            </option>
          ))}
        </select>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={cycle}
          className="gap-2"
          aria-label={`Connection: ${state.connection}. Click to change (demo control).`}
        >
          <span
            aria-hidden
            className={`size-2 rounded-full ${
              online ? "bg-emerald-500" : state.connection === "reconnecting" ? "bg-amber-500" : "bg-red-500"
            }`}
          />
          <span className="hidden text-xs font-medium capitalize sm:inline">{state.connection}</span>
          {online ? <Icons.online className="size-4 sm:hidden" /> : <Icons.offline className="size-4 sm:hidden" />}
        </Button>
        <NotificationPanel />
      </div>
    </header>
  );
}

export function ConnectionAlertSlot() {
  const { state, dispatch } = useStore();
  if (state.connection === "online") return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      <Icons.offline className="size-4 shrink-0" aria-hidden />
      <p className="flex-1">
        {state.connection === "reconnecting"
          ? "Reconnecting to the packer's device. Voice actions are paused."
          : "Connection lost. Logged boxes are queued locally and will sync when the device is back."}
      </p>
      <Button size="sm" variant="outline" onClick={() => dispatch({ type: "connection", value: "online" })}>
        Retry now
      </Button>
    </div>
  );
}

export { Badge };
