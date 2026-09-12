import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  getBox, insertEvent, insertItems, nextBoxId, norm, openBox, upsertBox,
} from "../db/queries.js";
import type { ToolContext } from "./types.js";

export const logItemSchema = z.object({
  box: z.string().optional().describe("Box number as the packer said it, e.g. '12' or 'A12'. Omit to use the open box."),
  room: z.string().optional().describe("Room the box belongs to, e.g. 'kitchen'."),
  items: z.array(z.string()).min(1).describe("Items being packed, as heard."),
  fragile: z.boolean().optional(),
  high_value: z.boolean().optional(),
});

export type LogItemArgs = z.infer<typeof logItemSchema>;

export interface LogItemResult {
  box_id: string;
  room: string;
  item_count: number;
  new_box: boolean;
}

/** The packer says "box twelve"; the stored id is prefixed with their letter. */
const canonicalBoxId = (spoken: string, packerId: string): string => {
  const trimmed = spoken.trim().toUpperCase();
  return /^[A-Z]/.test(trimmed) ? trimmed : `${packerId}${trimmed.replace(/\D/g, "")}`;
};

export async function logItem(args: LogItemArgs, ctx: ToolContext): Promise<LogItemResult> {
  const packerId = ctx.actorId;

  let boxId: string;
  let newBox = false;

  if (args.box) {
    boxId = canonicalBoxId(args.box, packerId);
    newBox = (await getBox(ctx.moveId, boxId)) === null;
  } else {
    const open = await openBox(ctx.moveId, packerId);
    if (open) {
      boxId = open.box_id;
    } else {
      boxId = await nextBoxId(ctx.moveId, packerId);
      newBox = true;
    }
  }

  const existing = await getBox(ctx.moveId, boxId);
  const room = args.room ?? existing?.room ?? "unsorted";

  await upsertBox({
    move_id: ctx.moveId,
    box_id: boxId,
    room,
    // Flags accumulate: a box with one fragile item stays fragile.
    fragile: args.fragile || existing?.fragile === 1 ? 1 : 0,
    high_value: args.high_value || existing?.high_value === 1 ? 1 : 0,
    status: existing?.status === "closed" ? "closed" : "open",
    packer_id: existing?.packer_id ?? packerId,
  });

  const items = args.items.map((name) => ({
    item_id: randomUUID(),
    move_id: ctx.moveId,
    box_id: boxId,
    name,
    name_norm: norm(name),
    fragile: args.fragile ? 1 : 0,
  }));
  await insertItems(items);

  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "item_logged",
    box_id: boxId,
    utterance: ctx.utterance,
    payload: { items: args.items, room, fragile: !!args.fragile, high_value: !!args.high_value },
  });

  return { box_id: boxId, room, item_count: items.length, new_box: newBox };
}
