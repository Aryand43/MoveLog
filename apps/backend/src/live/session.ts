import { Hono } from "hono";
import { env } from "../env.js";
import {
  getMoveByToken, insertEvent, openBox, parseSurvey, setMoveStatus,
} from "../db/queries.js";
import { jsonSchemaFor, toolsFor } from "../tools/index.js";
import { attachSideband } from "./sideband.js";
import { BACKEND_PROMPT, VOICE_PROMPT, openingContext } from "./prompts.js";

const LIVE_MODEL = "gpt-live-1";
const BACKEND_MODEL = "gpt-5.6-luna";

export const live = new Hono();

/** Responses-style function definitions for the delegated backend model. */
const functionDefs = () =>
  toolsFor("voice").map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: jsonSchemaFor(t),
  }));

/**
 * The browser sends its SDP offer here; we exchange it for an answer using the
 * project key. There is no ephemeral token in the Live flow — the browser never
 * holds a credential, and the session id the exchange returns is what we attach
 * the server-side sideband to.
 */
live.post("/live/session", async (c) => {
  const body = await c.req.json<{ token?: string; sdp?: string }>();
  if (!body.token || !body.sdp) return c.json({ error: "token and sdp required" }, 400);

  const move = await getMoveByToken("packer_token", body.token);
  if (!move) return c.json({ error: "unknown packer token" }, 404);

  // Packer letter prefixes their box ids; one letter per packer, no coordination.
  const packerId = "A";
  const survey = parseSurvey(move);
  const open = await openBox(move.move_id, packerId);

  const sessionConfig = {
    model: LIVE_MODEL,
    instructions: VOICE_PROMPT,
    delegation: {
      type: "responses",
      responses: {
        model: BACKEND_MODEL,
        instructions: BACKEND_PROMPT,
        reasoning: { effort: "low" },
        tools: functionDefs(),
      },
    },
  };

  const res = await fetch("https://api.openai.com/v1/live/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: sessionConfig,
      transport: { type: "webrtc", sdp: body.sdp },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error(`[live] session create failed (${res.status}): ${detail}`);
    return c.json({ error: "live_session_failed", status: res.status, detail }, 502);
  }

  const created = (await res.json()) as {
    session: { id: string };
    transport: { sdp: string };
  };

  await setMoveStatus(move.move_id, "packing");
  await insertEvent({
    move_id: move.move_id,
    actor_id: packerId,
    actor_type: "packer",
    event_type: "session_started",
    payload: { session_id: created.session.id },
  });

  // Attach out of band: the browser must get its SDP answer without waiting.
  void attachSideband({
    sessionId: created.session.id,
    moveId: move.move_id,
    packerId,
    opening: openingContext({
      moveId: move.move_id,
      customerName: move.customer_name,
      address: move.address,
      rooms: [...new Set(survey.map((s) => s.room))],
      openBox: open?.box_id ?? null,
      knownDamage: survey.filter((s) => s.known_damage).map((s) => `${s.item} (${s.known_damage})`),
    }),
  });

  return c.json({
    session_id: created.session.id,
    move_id: move.move_id,
    sdp: created.transport.sdp,
  });
});
