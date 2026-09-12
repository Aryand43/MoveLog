import { z } from "zod";
import { getBox, insertEvent, listItems, searchItems } from "../db/queries.js";
import { similarity } from "./match.js";
import type { ToolContext } from "./types.js";

export const findItemSchema = z.object({
  query: z.string().describe("What they're looking for, e.g. 'chargers' or 'the blender'."),
});

export type FindItemArgs = z.infer<typeof findItemSchema>;

export interface FindItemMatch {
  item: string;
  box_id: string;
  room: string;
  fragile: boolean;
}

export interface FindItemResult {
  found: boolean;
  matches: FindItemMatch[];
}

export async function findItem(args: FindItemArgs, ctx: ToolContext): Promise<FindItemResult> {
  // Substring first (cheap, indexed); fall back to fuzzy over the whole move.
  let candidates = await searchItems(ctx.moveId, args.query, 3);

  if (candidates.length === 0) {
    const all = await listItems(ctx.moveId);
    candidates = all
      .map((i) => ({ i, score: similarity(args.query, i.name) }))
      .filter((c) => c.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((c) => c.i);
  }

  const matches: FindItemMatch[] = [];
  for (const item of candidates) {
    const box = await getBox(ctx.moveId, item.box_id);
    matches.push({
      item: item.name,
      box_id: item.box_id,
      room: box?.room ?? "unknown",
      fragile: item.fragile === 1,
    });
  }

  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "query_asked",
    utterance: ctx.utterance,
    payload: { tool: "find_item", query: args.query, hits: matches.length },
  });

  return { found: matches.length > 0, matches };
}
