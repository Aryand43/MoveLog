import { getDiscrepancy, parseAssessment } from "../db/queries.js";
import { callTool } from "../tools/index.js";
import type { Assessment } from "./cards.js";
import { setDecisionHandler, updateDiscrepancyCard } from "./post.js";

/**
 * Closes the loop: an ops tap records the decision, speaks it into the packer's
 * live session, and rewrites the card in place so the group can see who decided
 * what. Lives here rather than in post.ts so the channel layer never imports the
 * tool layer.
 */
export function wireDecisionHandler(): void {
  setDecisionHandler(async ({ discrepancyId, decision, by }) => {
    const before = await getDiscrepancy(discrepancyId);
    if (!before) {
      console.warn(`[channels] decision on unknown discrepancy ${discrepancyId}`);
      return;
    }

    // resolve_discrepancy is idempotent and does the speaking; a second tap
    // re-states the standing decision rather than overwriting it.
    await callTool(
      "resolve_discrepancy",
      { discrepancy_id: discrepancyId, decision, by },
      { moveId: before.move_id, actorId: by, actorType: "ops" },
    );

    const after = await getDiscrepancy(discrepancyId);
    if (!after) return;

    await updateDiscrepancyCard({
      discrepancy: after,
      assessment: parseAssessment(after) as Assessment | null,
      photoUrl: after.photo_url || undefined,
      surveyMatch: after.survey_match || undefined,
    });
  });
}
