import { z } from "zod";
import {
  getMove, insertEvent, listBoxes, listDiscrepancies, listItems, parseSurvey,
} from "../db/queries.js";
import type { ToolContext } from "./types.js";

export const moveStatusSchema = z.object({});

export interface MoveStatusResult {
  status: string;
  boxes_closed: number;
  boxes_open: number;
  items: number;
  rooms_done: string[];
  rooms_pending: string[];
  open_discrepancies: number;
}

export async function moveStatus(_args: unknown, ctx: ToolContext): Promise<MoveStatusResult> {
  const move = await getMove(ctx.moveId);
  if (!move) throw new Error(`unknown move ${ctx.moveId}`);

  const [boxes, items, discrepancies] = await Promise.all([
    listBoxes(ctx.moveId), listItems(ctx.moveId), listDiscrepancies(ctx.moveId),
  ]);

  // A room counts as done when it has boxes and none of them are still open.
  const rooms = new Map<string, { open: number; closed: number }>();
  for (const b of boxes) {
    const r = rooms.get(b.room) ?? { open: 0, closed: 0 };
    if (b.status === "closed") r.closed += 1;
    else r.open += 1;
    rooms.set(b.room, r);
  }

  const surveyRooms = new Set(parseSurvey(move).map((s) => s.room));
  const rooms_done = [...rooms.entries()].filter(([, r]) => r.open === 0 && r.closed > 0).map(([n]) => n);
  const rooms_pending = [...new Set([...surveyRooms, ...rooms.keys()])].filter(
    (r) => !rooms_done.includes(r),
  );

  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "query_asked",
    utterance: ctx.utterance,
    payload: { tool: "move_status" },
  });

  return {
    status: move.status,
    boxes_closed: boxes.filter((b) => b.status === "closed").length,
    boxes_open: boxes.filter((b) => b.status !== "closed").length,
    items: items.length,
    rooms_done,
    rooms_pending,
    open_discrepancies: discrepancies.filter(
      (d) => d.state !== "decided" && d.state !== "dismissed",
    ).length,
  };
}
