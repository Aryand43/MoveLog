import { Hono } from "hono";
import { getDiscrepancy, parseAssessment } from "../db/queries.js";
import { callTool } from "../tools/index.js";
import type { Assessment } from "../channels/cards.js";
import { updateDiscrepancyCard } from "../channels/post.js";

export const decisions = new Hono();

/**
 * The console's resolve button. Deliberately the same path the Telegram button
 * takes — resolve_discrepancy speaks the decision into the packer's session —
 * so ops get the same outcome whichever surface they use.
 */
decisions.post("/api/discrepancy/:id/decision", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ decision?: string; by?: string }>();

  if (!body.decision || !["wrap_and_load", "hold", "claim"].includes(body.decision)) {
    return c.json({ error: "decision must be wrap_and_load, hold or claim" }, 400);
  }

  const before = await getDiscrepancy(id);
  if (!before) return c.json({ error: "not_found" }, 404);

  const result = await callTool(
    "resolve_discrepancy",
    { discrepancy_id: id, decision: body.decision, by: body.by ?? "console" },
    { moveId: before.move_id, actorId: body.by ?? "console", actorType: "ops" },
  );

  const after = await getDiscrepancy(id);
  if (after) {
    // Keep the Telegram card honest about a decision taken in the console.
    try {
      await updateDiscrepancyCard({
        discrepancy: after,
        assessment: parseAssessment(after) as Assessment | null,
        photoUrl: after.photo_url || undefined,
        surveyMatch: after.survey_match || undefined,
      });
    } catch (err) {
      console.error(`[decisions] card update failed for ${id}:`, err);
    }
  }

  return c.json({ ok: true, result });
});
