import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { baseUrl, env } from "../env.js";
import {
  getDiscrepancy, getMove, insertEvent, parseSurvey, upsertDiscrepancy,
} from "../db/queries.js";
import { say } from "../live/registry.js";
import { assessPhoto } from "../vision/assess.js";
import { postDiscrepancyCard } from "../channels/post.js";
import { bestMatch } from "../tools/match.js";

export const photos = new Hono();

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic",
};

/**
 * The packer's phone posts the damage photo here. One request does the whole
 * chain: store, assess, speak the verdict back into the earbuds, and put the
 * card in front of ops.
 */
photos.post("/photo/:discrepancyId", async (c) => {
  const id = c.req.param("discrepancyId");

  const d = await getDiscrepancy(id);
  if (!d) return c.json({ error: "unknown_discrepancy" }, 404);
  if (d.state === "decided" || d.state === "dismissed") {
    return c.json({ error: "already_resolved", state: d.state }, 409);
  }

  const form = await c.req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return c.json({ error: "photo field required" }, 400);

  const mimeType = file.type || "image/jpeg";
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${id}.${EXT[mimeType] ?? "jpg"}`;
  await writeFile(join(env.PHOTOS_DIR, filename), bytes);

  // Must be publicly reachable: Telegram fetches this itself to render the card.
  const photoUrl = `${baseUrl}/photos/${filename}`;

  await insertEvent({
    move_id: d.move_id, actor_id: "A", actor_type: "packer",
    event_type: "photo_received", discrepancy_id: id,
    payload: { photo_url: photoUrl, bytes: bytes.length },
  });

  const move = await getMove(d.move_id);
  const near = move ? bestMatch(d.item_name, parseSurvey(move), (s) => s.item) : null;
  const knownDamage = near && near.score >= 0.5 ? near.item.known_damage : "";

  let assessment = null;
  let assessmentError = "";
  try {
    assessment = await assessPhoto({
      imageBase64: bytes.toString("base64"),
      mimeType,
      itemName: d.item_name,
      reportedDamage: d.description,
      knownDamage,
    });
  } catch (err) {
    // Never drop it: the photo is stored and ops still get a card, just without
    // the model's read on it.
    assessmentError = err instanceof Error ? err.message : String(err);
    console.error(`[photos] assessment failed for ${id}: ${assessmentError}`);
    await insertEvent({
      move_id: d.move_id, actor_id: "system", actor_type: "system",
      event_type: "needs_review", discrepancy_id: id,
      payload: { stage: "assessment", error: assessmentError, needs_review: 1 },
    });
  }

  const updated = {
    ...d,
    state: "assessed" as const,
    photo_url: photoUrl,
    assessment: assessment ? JSON.stringify(assessment) : "{}",
  };
  await upsertDiscrepancy(updated);

  if (assessment) {
    await insertEvent({
      move_id: d.move_id, actor_id: "system", actor_type: "system",
      event_type: "assessment_done", discrepancy_id: id,
      payload: assessment as unknown as Record<string, unknown>,
    });
    await say(
      d.move_id,
      `Photo received. ${assessment.severity} ${assessment.damage_type} on the ` +
        `${d.item_name}${assessment.likely_new ? ", looks new" : ", may be pre-existing"}. ` +
        `Sent to ops.`,
    );
  } else {
    await say(d.move_id, `Photo received on the ${d.item_name}. Sent to ops for a look.`);
  }

  const ref = await postDiscrepancyCard({
    discrepancy: updated,
    assessment,
    photoUrl,
    surveyMatch: knownDamage ? `${near?.item.item}: ${knownDamage}` : undefined,
  });

  if (ref) {
    await upsertDiscrepancy({ ...updated, telegram_message_id: String(ref.id) });
  }

  return c.json({ ok: true, discrepancy_id: id, photo_url: photoUrl, assessment, assessmentError });
});
