import type { ReactNode } from "react";

/** These views predate the light console and are styled for a dark surface. */
export default function ManifestLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-neutral-950 text-neutral-100">{children}</div>;
}
