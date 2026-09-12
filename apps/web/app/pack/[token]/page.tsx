export const dynamic = "force-dynamic";

export default async function Pack({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Packer</h1>
      <p className="text-neutral-600 text-sm font-mono">{token} — voice session lands in Phase 3.</p>
    </main>
  );
}
