"use client";

import * as React from "react";
import { PageHeader } from "@/components/console/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MOVE, OPS_CHANNEL, OPS_SURFACE } from "@/lib/demo-data";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { state } = useStore();
  const [channel, setChannel] = React.useState(OPS_CHANNEL);
  const [autoEscalate, setAutoEscalate] = React.useState(true);
  const [requirePhoto, setRequirePhoto] = React.useState(true);
  const [saved, setSaved] = React.useState(false);

  return (
    <>
      <PageHeader title="Settings" description="Demo settings. Changes live in memory for this session only." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Escalation</CardTitle>
            <CardDescription>Where confirmed discrepancies are posted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">{OPS_SURFACE} channel</Label>
              <Input id="channel" value={channel} onChange={(e) => setChannel(e.target.value)} />
            </div>
            <Separator />
            <Toggle
              id="auto"
              label="Escalate automatically on confirmation"
              hint="Posts the card the moment a coordinator confirms."
              checked={autoEscalate}
              onChange={setAutoEscalate}
            />
            <Toggle
              id="photo"
              label="Require a photo before assessment"
              hint="The agent asks the packer for an image before the vision model runs."
              checked={requirePhoto}
              onChange={setRequirePhoto}
            />
            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
              >
                Save changes
              </Button>
              <span aria-live="polite" className="text-sm text-muted-foreground">
                {saved ? "Saved for this session." : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This move</CardTitle>
            <CardDescription>Read-only in the demo.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <Field label="Move ID" value={MOVE.id} mono />
              <Field label="Customer" value={MOVE.name} />
              <Field label="Route" value={MOVE.address} />
              <Field label="Date" value={MOVE.date} />
              <Field label="Boxes expected" value={String(MOVE.boxesTotal)} mono />
              <Field label="Boxes logged" value={String(state.boxes.length)} mono />
            </dl>
            <Separator className="my-4" />
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Demo mode</Badge>
              <p className="text-sm text-muted-foreground">No backend connected. All state is local.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Toggle({
  id, label, hint, checked, onChange,
}: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-slate-300"}`}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium ${mono ? "tabular" : ""}`}>{value}</dd>
    </div>
  );
}
