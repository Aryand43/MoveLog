import type { Box, Counts, MoveDetail, SurveyEntry } from "./model";

/** Header fields, derived from the live move rather than a fixture. */
export function moveDisplay(move: MoveDetail | null, counts: Counts) {
  return {
    id: move?.id ?? "—",
    name: move ? `${move.customer}` : "Loading…",
    address: move?.address ?? "",
    date: move?.date ?? "",
    status: move?.status ?? "planned",
    boxesTotal: counts.boxesClosed + counts.boxesOpen,
  };
}

export type RoomStatus = "done" | "active" | "pending";

/**
 * Room progress against the survey: a room is done when it has boxes and none
 * are still open, active while a box is open, and pending when the survey lists
 * it but nothing has been packed there yet.
 */
export function roomProgress(
  boxes: Box[],
  survey: SurveyEntry[],
): { name: string; status: RoomStatus; boxes: number }[] {
  const rooms = new Map<string, { open: number; closed: number }>();

  for (const b of boxes) {
    const r = rooms.get(b.room) ?? { open: 0, closed: 0 };
    if (b.status === "closed") r.closed += 1;
    else r.open += 1;
    rooms.set(b.room, r);
  }
  for (const s of survey) {
    if (!rooms.has(s.room)) rooms.set(s.room, { open: 0, closed: 0 });
  }

  return [...rooms.entries()]
    .map(([name, r]) => ({
      name,
      boxes: r.open + r.closed,
      status: (r.open > 0 ? "active" : r.closed > 0 ? "done" : "pending") as RoomStatus,
    }))
    .sort((a, b) => b.boxes - a.boxes || a.name.localeCompare(b.name));
}
