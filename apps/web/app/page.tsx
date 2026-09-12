import Link from "next/link";
import { ArrowRight, Boxes, Mic, PackageSearch, ShieldAlert } from "lucide-react";

const VIEWS = [
  {
    href: "/dashboard",
    title: "Live Move Dashboard",
    body: "Track progress box by box while the packer narrates. Voice status, transcript, and a running activity feed.",
    icon: Mic,
    meta: "18 of 32 boxes logged",
  },
  {
    href: "/discrepancies",
    title: "Discrepancy Review",
    body: "The packer photo sits beside the pre-move survey. The agent assesses it, then a coordinator decides.",
    icon: ShieldAlert,
    meta: "1 awaiting review",
  },
  {
    href: "/manifest",
    title: "Customer Manifest",
    body: "Every box searchable by what went inside, with a condition report the customer can download.",
    icon: PackageSearch,
    meta: "Searchable, shareable",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        {/* hero */}
        <section className="overflow-hidden rounded-2xl bg-sidebar px-7 py-10 text-sidebar-foreground md:px-10 md:py-12">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-emerald-500 text-[#06281f]">
              <Boxes className="size-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">MoveLog</span>
          </div>

          <h1 className="mt-7 max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            A hands-free packing log for moving crews.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-sidebar-muted">
            The packer narrates what goes into every box while their hands stay full. Damage that is not on the
            pre&#8209;move survey gets photographed, assessed, and escalated to ops before the truck leaves.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-[#06281f] transition-colors hover:bg-emerald-400"
            >
              Open the console
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-border px-3 py-1.5 text-xs text-sidebar-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
              Demo data, no backend required
            </span>
          </div>
        </section>

        {/* the three views */}
        <h2 className="mb-4 mt-10 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Choose a view
        </h2>

        <ul className="grid gap-4 md:grid-cols-3">
          {VIEWS.map(({ href, title, body, icon: Icon, meta }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <span className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-medium text-muted-foreground">
                  {meta}
                  <ArrowRight
                    className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-muted-foreground">
          Backend&#8209;connected views live at{" "}
          <Link href="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
            /admin
          </Link>
          . Everything above runs on local mock state.
        </p>
      </div>
    </main>
  );
}
