import { z } from "zod";
import { baseUrl, env } from "../env.js";
import { getMove, insertEvent, listBoxes, listItems, setMoveStatus } from "../db/queries.js";
import { pushToPhone } from "../live/registry.js";
import type { ToolContext } from "./types.js";

export const moveCompleteSchema = z.object({});

export interface MoveCompleteResult {
  move_id: string;
  boxes: number;
  items: number;
  /** Telegram deep link that binds the customer's chat to this move. */
  customer_link: string;
  manifest_url: string;
}

/**
 * Ends the job: flips the move to complete and hands the packer the customer's
 * deep link, which the phone shows as a QR for the customer to scan.
 */
export async function moveComplete(_args: unknown, ctx: ToolContext): Promise<MoveCompleteResult> {
  const move = await getMove(ctx.moveId);
  if (!move) throw new Error(`unknown move ${ctx.moveId}`);

  const [boxes, items] = await Promise.all([listBoxes(ctx.moveId), listItems(ctx.moveId)]);
  await setMoveStatus(ctx.moveId, "complete");

  const bot = env.TELEGRAM_BOT_USERNAME ?? "";
  const customer_link = bot ? `https://t.me/${bot}?start=${move.customer_token}` : "";
  const manifest_url = `${baseUrl}/m/${move.customer_token}`;

  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "move_completed",
    utterance: ctx.utterance,
    payload: { boxes: boxes.length, items: items.length, customer_link, manifest_url },
  });

  // The phone turns this into a QR the customer can scan on the spot.
  pushToPhone(ctx.moveId, { type: "handover", customer_link, manifest_url });

  return {
    move_id: ctx.moveId,
    boxes: boxes.length,
    items: items.length,
    customer_link,
    manifest_url,
  };
}
