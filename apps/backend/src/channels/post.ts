import { renderToIR } from "@copilotkit/channels";
import type { MessageRef } from "@copilotkit/channels";
import { env } from "../env.js";
import type { DiscrepancyRow } from "../db/types.js";
import {
  DECISIONS, DiscrepancyCard, decisionCallbackId, type Assessment, type DecisionKey,
  type DiscrepancyCardProps,
} from "./cards.js";
import { adapter, channel } from "./telegram.js";

/**
 * What happens when ops taps a decision button. Phase 5 replaces the default with
 * `resolve_discrepancy` + `say()` into the packer's live session; keeping it
 * injectable stops channels/ from importing the tool layer.
 */
export type DecisionHandler = (input: {
  discrepancyId: string;
  decision: DecisionKey;
  by: string;
}) => Promise<void>;

let onDecision: DecisionHandler = async ({ discrepancyId, decision, by }) => {
  console.log(`[channels] decision ${decision} on ${discrepancyId} by ${by} (no handler wired)`);
};

export const setDecisionHandler = (h: DecisionHandler): void => {
  onDecision = h;
};

/** Posted card refs, so a decision can edit the original message in place. */
const cardRefs = new Map<string, MessageRef>();

/** Button ids already registered, so re-posting a card doesn't double-register. */
const registered = new Set<string>();

function registerButtons(discrepancyId: string): void {
  if (!channel || registered.has(discrepancyId)) return;
  registered.add(discrepancyId);

  for (const { key } of DECISIONS) {
    // The renderer uses JSON.stringify(value) as callback_data when no action
    // registry bound the tree, which is the case for a proactively posted card.
    channel.onInteraction(decisionCallbackId(discrepancyId, key), async (ctx) => {
      const by = ctx.actor?.name ?? ctx.actor?.handle ?? "ops";
      await onDecision({ discrepancyId, decision: key, by });
    });
  }
}

export interface PostCardInput {
  discrepancy: DiscrepancyRow;
  assessment?: Assessment | null;
  photoUrl?: string;
  surveyMatch?: string;
}

/** Post a damage card into the ops group and wire its buttons. */
export async function postDiscrepancyCard(input: PostCardInput): Promise<MessageRef | null> {
  if (!adapter || !env.OPS_CHAT_ID) {
    console.warn("[channels] cannot post card — telegram not started or OPS_CHAT_ID unset");
    return null;
  }

  registerButtons(input.discrepancy.discrepancy_id);

  const ir = renderToIR(DiscrepancyCard(input as DiscrepancyCardProps));
  const ref = await adapter.post({ chatId: env.OPS_CHAT_ID }, ir);
  cardRefs.set(input.discrepancy.discrepancy_id, ref);
  return ref;
}

/** Re-render a posted card in place — used to show the decision that was taken. */
export async function updateDiscrepancyCard(input: PostCardInput): Promise<void> {
  const ref = cardRefs.get(input.discrepancy.discrepancy_id);
  if (!adapter || !ref) return;
  await adapter.update(ref, renderToIR(DiscrepancyCard(input as DiscrepancyCardProps)));
}

/** Plain text into the ops group, for status notes that don't warrant a card. */
export async function postToOps(text: string): Promise<void> {
  if (!adapter || !env.OPS_CHAT_ID) return;
  await adapter.post({ chatId: env.OPS_CHAT_ID }, renderToIR(text));
}
