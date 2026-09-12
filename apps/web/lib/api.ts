export const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

/**
 * Server-side fetch against the Modal backend. Never cached, this data is live.
 * A refused connection makes fetch throw rather than return, so catch it here
 * and let callers handle the null; otherwise the page 500s when the backend is
 * simply not running.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
