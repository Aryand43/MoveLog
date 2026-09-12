export const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

/** Server-side fetch against the Modal backend. Never cached — this data is live. */
export async function apiGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}
