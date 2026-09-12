import { z } from "zod";
import { insertEvent } from "../db/queries.js";
import { pushToPhone, setPaused } from "../live/registry.js";
import type { ToolContext } from "./types.js";

export const pauseLoggingSchema = z.object({});

export interface PauseResult {
  paused: boolean;
}

/** Mutes the packer's mic so crew chatter never reaches the log. */
export async function pauseLogging(_args: unknown, ctx: ToolContext): Promise<PauseResult> {
  setPaused(ctx.moveId, true);
  pushToPhone(ctx.moveId, { type: "paused", paused: true });
  await insertEvent({
    move_id: ctx.moveId, actor_id: ctx.actorId, actor_type: ctx.actorType,
    event_type: "logging_paused", utterance: ctx.utterance,
  });
  return { paused: true };
}

export async function resumeLogging(_args: unknown, ctx: ToolContext): Promise<PauseResult> {
  setPaused(ctx.moveId, false);
  pushToPhone(ctx.moveId, { type: "paused", paused: false });
  await insertEvent({
    move_id: ctx.moveId, actor_id: ctx.actorId, actor_type: ctx.actorType,
    event_type: "logging_resumed", utterance: ctx.utterance,
  });
  return { paused: false };
}
