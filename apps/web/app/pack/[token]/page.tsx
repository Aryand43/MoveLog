import PackClient from "./PackClient";
import { API } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Pack({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Resolved here, at request time, rather than inlined into the client bundle at
  // build time: a NEXT_PUBLIC_* var added after the first build would otherwise
  // leave the phone pointing at localhost with no visible cause.
  return <PackClient token={token} apiUrl={API} />;
}
