import Link from "next/link";
import { apiGet } from "@/lib/api";

interface Move {
  move_id: string;
  customer_name: string;
  address: string;
  move_date: string;
  status: string;
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await apiGet<{ moves: Move[] }>("/api/moves");

  if (!data) {
    return <main className="p-8 text-red-400">Backend unreachable.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Moves</h1>
      <ul className="divide-y divide-neutral-800 rounded border border-neutral-800">
        {data.moves.map((m) => (
          <li key={m.move_id} className="p-4 hover:bg-neutral-900">
            <Link href={`/admin/${m.move_id}`} className="flex justify-between gap-4">
              <span>
                <span className="font-mono">{m.move_id}</span>{" "}
                <span className="text-neutral-400">{m.customer_name}</span>
              </span>
              <span className="text-neutral-500">{m.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
