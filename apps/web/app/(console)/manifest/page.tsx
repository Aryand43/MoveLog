"use client";

import * as React from "react";
import { PageHeader } from "@/components/console/shell";
import { Icons } from "@/components/console/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MOVE, SURVEY_DAMAGE } from "@/lib/demo-data";
import { useStore } from "@/lib/store";

export default function ManifestPage() {
  const { state } = useStore();
  const [query, setQuery] = React.useState("chargers");
  const [share, setShare] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const q = query.trim().toLowerCase();
  const results = React.useMemo(() => {
    if (!q) return state.boxes;
    return state.boxes.filter(
      (b) =>
        b.items.some((i) => i.toLowerCase().includes(q)) ||
        b.room.toLowerCase().includes(q) ||
        String(b.number) === q
    );
  }, [q, state.boxes]);

  const newDamage = state.discrepancies.filter((d) => d.status === "confirmed");
  const shareUrl = `https://movelog.app/m/${MOVE.id.toLowerCase()}`;

  function downloadReport() {
    const lines = [
      `MoveLog manifest: ${MOVE.name} (${MOVE.id})`,
      `${MOVE.address}`,
      `${MOVE.date} · ${state.boxes.length} of ${MOVE.boxesTotal} boxes logged`,
      "",
      "BOXES",
      ...state.boxes.map(
        (b) => `  Box ${b.number} · ${b.room}${b.fragile ? " · FRAGILE" : ""}: ${b.items.join(", ")}`
      ),
      "",
      "CONDITION REPORT",
      "  Pre-existing (from the pre-move survey):",
      ...SURVEY_DAMAGE.map((s) => `    - ${s.item} (${s.room}): ${s.note}`),
      "  Newly reported during packing:",
      ...(newDamage.length
        ? newDamage.map(
            (d) =>
              `    - ${d.item} (Box ${d.boxNumber}, ${d.room}): ${d.assessment.damageType}, ${d.assessment.location}, ${d.assessment.severity}. Confirmed by ${d.decidedBy}.`
          )
        : ["    - None confirmed"]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movelog-${MOVE.id}-manifest.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Customer Manifest"
        description={`${state.boxes.length} boxes · ${MOVE.name}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShare(true)}>
              <Icons.share aria-hidden />
              Share
            </Button>
            <Button onClick={downloadReport}>
              <Icons.download aria-hidden />
              Download report
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-5">
          <Label htmlFor="manifest-search" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Search the manifest
          </Label>
          <div className="relative mt-2">
            <Icons.search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="manifest-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “chargers”, “kitchen”, or a box number"
              className="h-10 pl-9"
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
            {q ? (
              results.length > 0 ? (
                <>
                  <span className="font-medium text-foreground">{results.length}</span>{" "}
                  {results.length === 1 ? "match" : "matches"} for &ldquo;{query}&rdquo;
                  {results.length === 1 && (
                    <>
                      {" "}
                      in <span className="font-medium text-foreground">Box {results[0].number}, {results[0].room}</span>
                    </>
                  )}
                </>
              ) : (
                <>No boxes match &ldquo;{query}&rdquo;</>
              )
            ) : (
              <>Showing all {state.boxes.length} boxes</>
            )}
          </p>
        </CardContent>
      </Card>

      {state.hydrating ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Icons.search className="size-6" aria-hidden />
            </span>
            <p className="text-base font-medium">Nothing packed under that name</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Every item is logged by voice as it goes in the box, so try the word the packer would have said.
            </p>
            <Button variant="outline" className="mt-2" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((b) => (
            <li key={b.id}>
              <Card className="h-full">
                <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="tabular text-base">Box {b.number}</CardTitle>
                    <p className="text-sm text-muted-foreground">{b.room}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {b.fragile && <Badge variant="warning">Fragile</Badge>}
                    {b.flagged && <Badge variant="danger">Flagged</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-sm">
                    {b.items.map((i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground" />
                        {i}
                      </li>
                    ))}
                  </ul>
                  <div className="tabular flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icons.camera className="size-3.5" aria-hidden />
                      {b.photos} {b.photos === 1 ? "photo" : "photos"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.clock className="size-3.5" aria-hidden />
                      {b.loggedAt}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Condition report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Badge variant="secondary">Pre-existing</Badge>
              <span className="text-muted-foreground">Recorded on the pre-move survey</span>
            </h3>
            <ul className="space-y-2">
              {SURVEY_DAMAGE.map((s) => (
                <li key={s.item} className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{s.item}</p>
                  <p className="text-muted-foreground">
                    {s.note} · {s.room}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Badge variant="danger">Newly reported</Badge>
              <span className="text-muted-foreground">Found during this packing job</span>
            </h3>
            {newDamage.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nothing confirmed yet. Items still under review don&rsquo;t appear on the customer&rsquo;s copy.
              </p>
            ) : (
              <ul className="space-y-2">
                {newDamage.map((d) => (
                  <li key={d.id} className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm">
                    <p className="font-medium">{d.item}</p>
                    <p className="text-muted-foreground">
                      {d.assessment.damageType}, {d.assessment.location.toLowerCase()} · {d.assessment.severity} · Box{" "}
                      {d.boxNumber}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Confirmed by {d.decidedBy}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      <Dialog open={share} onOpenChange={setShare}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share the manifest</DialogTitle>
            <DialogDescription>
              A read-only link for the customer. It shows boxes, photos and the condition report. Nothing internal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={shareUrl} aria-label="Shareable manifest link" className="font-mono text-xs" />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
