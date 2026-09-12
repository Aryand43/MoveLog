import { Hono } from "hono";
import {
  getMove, getMoveByToken, listBoxes, listDiscrepancies, listEvents, listItems, listMoves, parseSurvey,
} from "../db/queries.js";

export const api = new Hono();

api.get("/api/moves", async (c) => c.json({ moves: await listMoves() }));

api.get("/api/move/:id", async (c) => {
  const move = await getMove(c.req.param("id"));
  if (!move) return c.json({ error: "not_found" }, 404);
  const [boxes, items, discrepancies] = await Promise.all([
    listBoxes(move.move_id), listItems(move.move_id), listDiscrepancies(move.move_id),
  ]);
  return c.json({ move: { ...move, survey: parseSurvey(move) }, boxes, items, discrepancies });
});

api.get("/api/events", async (c) => {
  const moveId = c.req.query("move_id");
  if (!moveId) return c.json({ error: "move_id required" }, 400);
  return c.json({ events: await listEvents(moveId, Number(c.req.query("limit") ?? 200)) });
});

/** Customer-facing manifest, addressed only by the opaque token. */
api.get("/api/manifest/:token", async (c) => {
  const move = await getMoveByToken("customer_token", c.req.param("token"));
  if (!move) return c.json({ error: "not_found" }, 404);
  const [boxes, items, discrepancies] = await Promise.all([
    listBoxes(move.move_id), listItems(move.move_id), listDiscrepancies(move.move_id),
  ]);
  return c.json({
    move: {
      move_id: move.move_id, customer_name: move.customer_name, address: move.address,
      move_date: move.move_date, status: move.status, survey: parseSurvey(move),
    },
    boxes, items, discrepancies,
  });
});

/** Packer page bootstrap: token -> move context, no secrets. */
api.get("/api/pack/:token", async (c) => {
  const move = await getMoveByToken("packer_token", c.req.param("token"));
  if (!move) return c.json({ error: "not_found" }, 404);
  return c.json({
    move_id: move.move_id, customer_name: move.customer_name, address: move.address,
    status: move.status, survey: parseSurvey(move),
  });
});
