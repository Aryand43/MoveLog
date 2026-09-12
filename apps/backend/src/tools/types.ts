import type { ActorType } from "../db/types.js";

export interface ToolContext {
  moveId: string;
  actorId: string;
  actorType: ActorType;
  /** What the packer actually said, when the call came from the voice path. */
  utterance?: string;
}

export type ToolHandler<A, R> = (args: A, ctx: ToolContext) => Promise<R>;

/** Where a tool may be offered. The customer set is additionally move-scoped. */
export type Surface = "voice" | "ops" | "customer";
