import { apiGet } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Row { [k: string]: unknown }

interface ManifestPayload {
  move: {
    move_id: string; customer_name: string; address: string; move_date: string;
    status: string; survey: { item: string; room: string; known_damage: string }[];
  };
  boxes: { box_id: string; room: string; fragile: number; high_value: number; status: string }[];
  items: { item_id: string; box_id: string; name: string; fragile: number }[];
  discrepancies: {
    discrepancy_id: string; item_name: string; description: string; state: string;
    photo_url: string; assessment: string; decision: string; decided_by: string;
  }[];
}

const DECISION: Record<string, string> = {
  wrap_and_load: "Wrapped and loaded",
  hold: "Held back for inspection",
  claim: "Claim opened",
};

/**
 * The customer's copy of the move. Addressed only by the opaque token in the
 * URL — no account, no login — because asking someone to sign up to find out
 * which box their chargers are in would make the product worse.
 */
export default async function Manifest({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await apiGet<ManifestPayload>(`/api/manifest/${token}`);

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">Manifest not found</h1>
        <p className="mt-2 text-neutral-400">
          Check the link your movers sent you, or ask them to resend it.
        </p>
      </main>
    );
  }

  const { move, boxes, items, discrepancies } = data;

  const byBox = new Map<string, string[]>();
  for (const i of items) {
    byBox.set(i.box_id, [...(byBox.get(i.box_id) ?? []), i.name]);
  }

  const rooms = new Map<string, typeof boxes>();
  for (const b of boxes) {
    rooms.set(b.room, [...(rooms.get(b.room) ?? []), b]);
  }

  const preExisting = move.survey.filter((s) => s.known_damage);
  const newDamage = discrepancies.filter((d) => d.state !== "dismissed");

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-wider text-neutral-400">Move {move.move_id}</p>
        <h1 className="text-2xl font-semibold">{move.customer_name}</h1>
        <p className="text-neutral-400">{move.address}</p>
        <p className="text-sm text-neutral-500">
          {move.move_date} · {boxes.length} boxes · {items.length} items ·{" "}
          {move.status === "complete" ? "Packing complete" : "Packing in progress"}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">What&rsquo;s in each box</h2>
        {boxes.length === 0 && <p className="text-neutral-400">Nothing packed yet.</p>}
        {[...rooms.entries()].map(([room, roomBoxes]) => (
          <div key={room} className="space-y-2">
            <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">{room}</h3>
            <ul className="space-y-2">
              {roomBoxes.map((b) => (
                <li key={b.box_id} className="rounded-lg border border-neutral-800 p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{b.box_id}</span>
                    {b.fragile === 1 && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                        Fragile
                      </span>
                    )}
                    {b.status !== "closed" && (
                      <span className="text-xs text-neutral-500">still open</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-300">
                    {(byBox.get(b.box_id) ?? []).join(", ") || "—"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Condition report</h2>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
            Already noted before the move
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-neutral-300">
            {preExisting.length === 0 && <li className="text-neutral-500">Nothing recorded.</li>}
            {preExisting.map((s) => (
              <li key={s.item}>
                <span className="font-medium">{s.item}</span> ({s.room}) — {s.known_damage}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
            Reported during packing
          </h3>
          <ul className="mt-2 space-y-2">
            {newDamage.length === 0 && (
              <li className="text-sm text-neutral-500">Nothing new was reported.</li>
            )}
            {newDamage.map((d) => {
              let a: Record<string, string> = {};
              try { a = JSON.parse(d.assessment) as Record<string, string>; } catch { /* none */ }
              return (
                <li key={d.discrepancy_id} className="rounded-lg border border-neutral-800 p-3 text-sm">
                  <p className="font-medium">{d.item_name}</p>
                  <p className="text-neutral-400">{d.description}</p>
                  {a.severity && (
                    <p className="mt-1 text-neutral-400">
                      {a.severity} {a.damage_type} — {a.location}
                    </p>
                  )}
                  {d.photo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={d.photo_url}
                      alt={`${d.item_name} damage`}
                      className="mt-2 max-h-64 rounded-lg border border-neutral-800"
                    />
                  )}
                  {d.decision && (
                    <p className="mt-2 text-neutral-300">
                      {DECISION[d.decision] ?? d.decision}
                      {d.decided_by ? ` · ${d.decided_by}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <footer className="border-t border-neutral-800 pt-4 text-sm text-neutral-500">
        Questions about a specific item? Message the MoveLog bot on Telegram and ask
        &ldquo;where are my chargers?&rdquo;
      </footer>
    </main>
  );
}
