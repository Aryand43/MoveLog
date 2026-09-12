import { z } from "zod";
import { countItemsInBox, getBox, insertEvent, openBox, upsertBox } from "../db/queries.js";
import type { ToolContext } from "./types.js";

export const closeBoxSchema = z.object({
  box: z.string().optional().describe("Box to close. Omit to close the packer's open box."),
});

export type CloseBoxArgs = z.infer<typeof closeBoxSchema>;

export interface CloseBoxResult {
  box_id: string;
  item_count: number;
  already_closed?: boolean;
}

export async function closeBox(args: CloseBoxArgs, ctx: ToolContext): Promise<CloseBoxResult> {
  const boxId = args.box
    ? (/^[A-Z]/i.test(args.box.trim()) ? args.box.trim().toUpperCase() : `${ctx.actorId}${args.box.replace(/\D/g, "")}`)
    : (await openBox(ctx.moveId, ctx.actorId))?.box_id;

  if (!boxId) throw new Error("no open box to close");

  const box = await getBox(ctx.moveId, boxId);
  if (!box) throw new Error(`box ${boxId} not found`);

  const item_count = await countItemsInBox(ctx.moveId, boxId);

  // Idempotent: closing a closed box still reports the count.
  if (box.status === "closed") return { box_id: boxId, item_count, already_closed: true };

  await upsertBox({ ...box, status: "closed" });
  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "box_closed",
    box_id: boxId,
    utterance: ctx.utterance,
    payload: { item_count, room: box.room },
  });

  return { box_id: boxId, item_count };
}
