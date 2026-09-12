import { apiGet } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MoveDetail({ params }: { params: Promise<{ moveId: string }> }) {
  const { moveId } = await params;
  const data = await apiGet<{ move: { customer_name: string; status: string } }>(`/api/move/${moveId}`);
  if (!data) return <main className="p-8 text-red-400">Move not found.</main>;
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-2">
      <h1 className="text-2xl font-semibold font-mono">{moveId}</h1>
      <p className="text-neutral-400">{data.move.customer_name} — {data.move.status}</p>
      <p className="text-neutral-600 text-sm">Live event feed lands in Phase 6.</p>
    </main>
  );
}
