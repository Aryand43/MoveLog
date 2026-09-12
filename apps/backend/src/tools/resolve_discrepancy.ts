import { z } from "zod";
import { getDiscrepancy, insertEvent, upsertDiscrepancy } from "../db/queries.js";
import { say } from "../live/registry.js";
import type { Decision } from "../db/types.js";
import type { ToolContext } from "./types.js";

export const resolveDiscrepancySchema = z.object({
  discrepancy_id: z.string(),
  decision: z.enum(["wrap_and_load", "hold", "claim"]),
  by: z.string().describe("Who decided — the ops person's name."),
});

export type ResolveDiscrepancyArgs = z.infer<typeof resolveDiscrepancySchema>;

export interface ResolveDiscrepancyResult {
  ok: boolean;
  discrepancy_id: string;
  decision: Decision;
  decided_by: string;
  /** True when this call changed nothing because a decision already stood. */
  already_decided: boolean;
  spoken: boolean;
}

const SPOKEN: Record<Decision, string> = {
  wrap_and_load: "Ops says wrap it and load it. The damage is on record.",
  hold: "Ops says hold that item — don't load it until someone checks.",
  claim: "Ops has opened a claim. Wrap it, load it, and don't discard the packaging.",
};

/**
 * The ops end of the round trip. Idempotent: a second tap on an already-decided
 * card re-states the standing decision rather than overwriting it.
 */
export async function resolveDiscrepancy(
  args: ResolveDiscrepancyArgs,
  ctx: ToolContext,
): Promise<ResolveDiscrepancyResult> {
  const d = await getDiscrepancy(args.discrepancy_id);
  if (!d) throw new Error(`unknown discrepancy ${args.discrepancy_id}`);

  if (d.state === "decided" && d.decision) {
    const spoken = await say(d.move_id, SPOKEN[d.decision as Decision] ?? `Ops already decided: ${d.decision}.`);
    return {
      ok: true,
      discrepancy_id: d.discrepancy_id,
      decision: d.decision as Decision,
      decided_by: d.decided_by,
      already_decided: true,
      spoken,
    };
  }

  await upsertDiscrepancy({
    ...d,
    state: "decided",
    decision: args.decision,
    decided_by: args.by,
  });

  await insertEvent({
    move_id: d.move_id,
    actor_id: args.by,
    actor_type: ctx.actorType === "packer" ? "ops" : ctx.actorType,
    event_type: "decision_made",
    discrepancy_id: d.discrepancy_id,
    payload: { decision: args.decision, item: d.item_name },
  });

  const spoken = await say(d.move_id, SPOKEN[args.decision]);

  return {
    ok: true,
    discrepancy_id: d.discrepancy_id,
    decision: args.decision,
    decided_by: args.by,
    already_decided: false,
    spoken,
  };
}
