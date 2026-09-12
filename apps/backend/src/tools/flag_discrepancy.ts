import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getMove, insertEvent, parseSurvey, upsertDiscrepancy } from "../db/queries.js";
import { pushToPhone } from "../live/registry.js";
import { bestMatch } from "./match.js";
import type { ToolContext } from "./types.js";

export const flagDiscrepancySchema = z.object({
  item: z.string().describe("The damaged item."),
  damage: z.string().describe("What the packer saw."),
});

export type FlagDiscrepancyArgs = z.infer<typeof flagDiscrepancySchema>;

export interface FlagDiscrepancyResult {
  discrepancy_id: string;
  status: "photo_requested";
  camera_opened: boolean;
}

/** Short ids keep Telegram's 64-byte callback_data budget comfortable. */
const shortId = (): string => randomUUID().replace(/-/g, "").slice(0, 10);

export async function flagDiscrepancy(
  args: FlagDiscrepancyArgs,
  ctx: ToolContext,
): Promise<FlagDiscrepancyResult> {
  const move = await getMove(ctx.moveId);
  if (!move) throw new Error(`unknown move ${ctx.moveId}`);

  // Record the closest survey line even when it did not qualify as a match, so
  // ops can see what the item might correspond to.
  const near = bestMatch(args.item, parseSurvey(move), (s) => s.item);
  const surveyMatch = near && near.score >= 0.5 && near.item.known_damage
    ? `${near.item.item}: ${near.item.known_damage}`
    : "";

  const discrepancy_id = shortId();

  await upsertDiscrepancy({
    discrepancy_id,
    move_id: ctx.moveId,
    item_name: args.item,
    description: args.damage,
    state: "awaiting_photo",
    survey_match: surveyMatch,
    photo_url: "",
    assessment: "{}",
    packer_confirmed: 0,
    decision: "",
    decided_by: "",
    telegram_message_id: "",
  });

  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "discrepancy_opened",
    discrepancy_id,
    utterance: ctx.utterance,
    payload: { item: args.item, damage: args.damage, survey_match: surveyMatch },
  });

  const camera_opened = pushToPhone(ctx.moveId, { type: "camera", discrepancy_id });

  return { discrepancy_id, status: "photo_requested", camera_opened };
}
