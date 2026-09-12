export const dynamic = "force-dynamic";

export default async function Manifest({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Your move</h1>
      <p className="text-neutral-600 text-sm font-mono">{token} — manifest lands in Phase 6.</p>
    </main>
  );
}
