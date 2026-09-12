"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold">This view failed to load</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The console kept the rest of your session. Retrying re-renders just this view.
      </p>
      {error.digest && <p className="tabular mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
