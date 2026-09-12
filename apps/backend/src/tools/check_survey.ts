import { z } from "zod";
import { getMove, insertEvent, parseSurvey } from "../db/queries.js";
import { bestMatch } from "./match.js";
import type { ToolContext } from "./types.js";

export const checkSurveySchema = z.object({
  item: z.string().describe("The damaged item, as heard."),
  damage: z.string().describe("The damage the packer described."),
});

export type CheckSurveyArgs = z.infer<typeof checkSurveySchema>;

export interface CheckSurveyResult {
  on_survey: boolean;
  match?: string;
  known_damage?: string;
  confidence: number;
}

/** Above this the item is the same item; below it we treat it as unlisted. */
const ITEM_THRESHOLD = 0.5;
/** Damage wording varies more than item names, so this is looser. */
const DAMAGE_THRESHOLD = 0.25;

/**
 * Was this damage already on the pre-move survey? Only a match on BOTH the item
 * and the damage counts — a scratched dresser on the survey does not excuse a
 * snapped leg.
 */
export async function checkSurvey(
  args: CheckSurveyArgs,
  ctx: ToolContext,
): Promise<CheckSurveyResult> {
  const move = await getMove(ctx.moveId);
  if (!move) throw new Error(`unknown move ${ctx.moveId}`);

  const damaged = parseSurvey(move).filter((s) => s.known_damage !== "");
  const hit = bestMatch(args.item, damaged, (s) => s.item);

  const itemScore = hit?.score ?? 0;
  const damageScore = hit ? bestMatch(args.damage, [hit.item], (s) => s.known_damage)?.score ?? 0 : 0;
  const on_survey = itemScore >= ITEM_THRESHOLD && damageScore >= DAMAGE_THRESHOLD;

  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "survey_checked",
    utterance: ctx.utterance,
    payload: { item: args.item, damage: args.damage, on_survey, item_score: itemScore, damage_score: damageScore },
  });

  return on_survey && hit
    ? {
        on_survey: true,
        match: hit.item.item,
        known_damage: hit.item.known_damage,
        confidence: Number(Math.min(itemScore, 1).toFixed(2)),
      }
    : { on_survey: false, confidence: Number(Math.min(itemScore, 1).toFixed(2)) };
}
