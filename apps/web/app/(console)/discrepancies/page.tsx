"use client";

import * as React from "react";
import { PageHeader } from "@/components/console/shell";
import { AuditTimeline } from "@/components/console/timeline";
import { EvidencePhoto } from "@/components/console/photo";
import { Icons } from "@/components/console/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { OPS_CHANNEL, type Discrepancy } from "@/lib/model";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const STATUS: Record<Discrepancy["status"], { label: string; variant: "warning" | "danger" | "success" | "secondary" }> = {
  pending: { label: "Awaiting human review", variant: "warning" },
  awaiting_photo: { label: "Awaiting photo", variant: "secondary" },
  confirmed: { label: "Confirmed, claim opened", variant: "danger" },
  pre_existing: { label: "Pre-existing damage", variant: "success" },
};

export default function DiscrepanciesPage() {
  const { state, resolve } = useStore();
  const [selectedId, setSelectedId] = React.useState(state.discrepancies[0]?.id ?? "");

  const selected = state.discrepancies.find((d) => d.id === selectedId) ?? state.discrepancies[0];
  const blocked = state.connection !== "online";

  if (state.hydrating) {
    return (
      <>
        <PageHeader title="Discrepancy Review" />
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-[32rem]" />
        </div>
      </>
    );
  }

  if (!selected) {
    return (
      <>
        <PageHeader title="Discrepancy Review" />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <Icons.check className="size-6" aria-hidden />
            </span>
            <p className="text-base font-medium">No discrepancies on this move</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Damage the packer reports that isn&rsquo;t on the pre-move survey lands here for a human decision.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const decided = selected.status === "confirmed" || selected.status === "pre_existing";

  return (
    <>
      <PageHeader
        title="Discrepancy Review"
        description="The agent assesses. A person decides. Nothing reaches the customer without a human on the record."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* queue */}
        <nav aria-label="Discrepancy queue" className="space-y-2">
          {state.discrepancies.map((d) => {
            const active = d.id === selected.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-secondary/60",
                  active && "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                )}
              >
                <p className="text-sm font-medium leading-snug">{d.title}</p>
                <p className="tabular mt-1 text-xs text-muted-foreground">
                  Box {d.boxNumber} · {d.room} · {d.reportedAt}
                </p>
                <Badge variant={STATUS[d.status].variant} className="mt-2">
                  {STATUS[d.status].label}
                </Badge>
              </button>
            );
          })}
        </nav>

        {/* detail */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{selected.title}</CardTitle>
                <p className="tabular mt-1 text-sm text-muted-foreground">
                  Box {selected.boxNumber} · {selected.room} · reported {selected.reportedAt}
                </p>
              </div>
              <Badge variant={STATUS[selected.status].variant}>{STATUS[selected.status].label}</Badge>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <EvidencePhoto variant="damaged" caption={`Packer photo at ${selected.reportedAt}`} />
                <EvidencePhoto variant="survey" caption="Pre-move survey reference, 4 Sep" />
              </div>

              <Alert>
                <Icons.bot aria-hidden />
                <AlertTitle>AI assessment (suggestion only)</AlertTitle>
                <AlertDescription>
                  Generated by the vision model from the packer photo. It does not change the record until a
                  coordinator confirms it below.
                </AlertDescription>
              </Alert>

              {selected.assessment ? (
                <dl className="grid gap-x-6 gap-y-3 rounded-lg border bg-muted/50 p-4 sm:grid-cols-2">
                  <Row label="Damage type" value={selected.assessment.damageType} />
                  <Row label="Location" value={selected.assessment.location} />
                  <Row label="Severity" value={selected.assessment.severity} />
                  <Row
                    label="Survey match"
                    value={selected.assessment.surveyMatch}
                    tone={selected.assessment.surveyMatch === "Not found" ? "warn" : undefined}
                  />
                  {/* The model reports no confidence score, so we show the
                      judgement it does make: is this damage new? */}
                  <Row
                    label="Pre-existing"
                    value={selected.assessment.likelyNew ? "No — looks new" : "Possibly"}
                    tone={selected.assessment.likelyNew ? "warn" : undefined}
                  />
                  {selected.assessment.claims && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Claim wording
                      </dt>
                      <dd className="mt-1.5 text-sm italic">{selected.assessment.claims}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                  Waiting for the packer&rsquo;s photo — the assessment appears here once it arrives.
                </p>
              )}

              <Separator />

              <div>
                <p className="mb-2 text-sm font-medium">
                  {decided ? "Decision recorded" : "Your decision"}
                  {!decided && <span className="ml-2 text-xs font-normal text-muted-foreground">Required before this closes</span>}
                </p>
                {decided ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <Icons.check className="size-4 shrink-0" aria-hidden />
                    <span>
                      {STATUS[selected.status].label} by <strong>{selected.decidedBy}</strong> · posted to {OPS_CHANNEL}
                    </span>

                  </div>
                ) : (
                  <>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void resolve(selected.id, "wrap_and_load")} disabled={blocked}>
                      <Icons.check aria-hidden />
                      Wrap &amp; load
                    </Button>
                    <Button variant="outline" onClick={() => void resolve(selected.id, "hold")} disabled={blocked}>
                      Hold
                    </Button>
                    <Button variant="outline" onClick={() => void resolve(selected.id, "claim")} disabled={blocked}>
                      <Icons.flag aria-hidden />
                      Open claim
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    The packer hears this decision in their earbuds, and the card in{" "}
                    {OPS_CHANNEL} updates to match.
                  </p>
                  </>
                )}
                {selected.photoRequests > 1 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selected.photoRequests} photos requested from the packer.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline events={selected.timeline} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-medium", tone === "warn" && "text-amber-800")}>{value}</dd>
    </div>
  );
}
