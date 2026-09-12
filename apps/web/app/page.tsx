import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">MoveLog</h1>
      <p className="text-neutral-400">
        One agent, three surfaces: the packer&rsquo;s earbuds, the ops Telegram group, and the
        customer&rsquo;s private chat.
      </p>
      <Link className="inline-block rounded bg-neutral-800 px-4 py-2" href="/admin">
        Ops dashboard
      </Link>
    </main>
  );
}
