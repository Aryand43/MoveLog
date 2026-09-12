import { Hono } from "hono";
import {
  getMove, listBoxes, listDiscrepancies, listEvents, listItems, listMoves, norm, parseSurvey,
} from "../db/queries.js";
import type { BoxRow, DiscrepancyRow, EventRow, ItemRow } from "../db/types.js";
import { voiceState } from "../live/registry.js";

export const consoleApi = new Hono();

/** "A12" -> 12, so the UI can show a plain box number. */
const boxNumber = (boxId: string): number => Number(boxId.replace(/^[A-Za-z]+/, "")) || 0;

const hhmm = (ts: string): string => ts.slice(11, 16);

/** Our five discrepancy states, in the vocabulary the console renders. */
const STATUS: Record<string, string> = {
  awaiting_photo: "awaiting_photo",
  assessed: "pending",
  confirmed: "confirmed",
  decided: "confirmed",
  dismissed: "pre_existing",
};

const SEVERITY: Record<string, string> = {
  cosmetic: "Minor", minor: "Minor", moderate: "Moderate", severe: "Severe",
};

const KIND: Record<string, string> = {
  session_started: "voice", session_ended: "voice",
  logging_paused: "voice", logging_resumed: "voice", query_asked: "voice",
  item_logged: "log", box_opened: "log", box_closed: "log",
  photo_received: "photo",
  assessment_done: "ai", survey_checked: "ai",
  discrepancy_opened: "human", defect_reported: "human",
  decision_made: "ops",
  needs_review: "system", move_completed: "system",
};

/** One readable line per event, built from the payload we actually stored. */
function describe(e: EventRow): { text: string; detail?: string } {
  let p: Record<string, any> = {};
  try { p = JSON.parse(e.payload) as Record<string, any>; } catch { /* keep empty */ }

  switch (e.event_type) {
    case "item_logged":
      return { text: `${(p.items ?? []).join(", ")} → box ${e.box_id}`, detail: p.room };
    case "box_closed":
      return { text: `Box ${e.box_id} closed`, detail: `${p.item_count ?? 0} items` };
    case "survey_checked":
      return {
        text: `Checked "${p.item}" against the survey`,
        detail: p.on_survey ? "already on the survey" : "not on the survey",
      };
    case "discrepancy_opened":
      return { text: `Damage reported: ${p.item}`, detail: p.damage };
    case "photo_received":
      return { text: "Photo received from the packer" };
    case "assessment_done":
      return {
        text: `Assessed: ${p.severity} ${p.damage_type}`,
        detail: p.likely_new ? "looks new" : "may be pre-existing",
      };
    case "decision_made":
      return { text: `Ops decided: ${String(p.decision ?? "").replace(/_/g, " ")}`, detail: p.item };
    case "needs_review":
      return { text: `Needs review: ${p.tool ?? "unknown"}`, detail: p.error };
    case "query_asked":
      return { text: `Asked: ${p.query ?? p.tool}` };
    case "session_started":
      return { text: "Packer session started" };
    case "logging_paused":
      return { text: "Logging paused" };
    case "logging_resumed":
      return { text: "Logging resumed" };
    case "move_completed":
      return { text: "Move marked complete" };
    default:
      return { text: e.event_type.replace(/_/g, " ") };
  }
}

/** Discrepancies carry no box id, so locate the item by name instead. */
function boxForItem(itemName: string, items: ItemRow[]): ItemRow | undefined {
  const q = norm(itemName);
  return items.find((i) => i.name_norm === q)
    ?? items.find((i) => i.name_norm.includes(q) || q.includes(i.name_norm));
}

function shapeDiscrepancy(d: DiscrepancyRow, items: ItemRow[], boxes: BoxRow[], events: EventRow[]) {
  let a: Record<string, any> = {};
  try { a = JSON.parse(d.assessment) as Record<string, any>; } catch { /* keep empty */ }

  const item = boxForItem(d.item_name, items);
  const box = item ? boxes.find((b) => b.box_id === item.box_id) : undefined;

  return {
    id: d.discrepancy_id,
    title: `${d.item_name} — ${d.description}`,
    item: d.item_name,
    boxNumber: box ? boxNumber(box.box_id) : 0,
    boxId: box?.box_id ?? "",
    room: box?.room ?? "",
    reportedAt: hhmm(d.updated_at),
    status: STATUS[d.state] ?? "pending",
    decision: d.decision,
    decidedBy: d.decided_by || undefined,
    photoUrl: d.photo_url || undefined,
    photoRequests: d.photo_url ? 1 : 0,
    assessment: Object.keys(a).length
      ? {
          damageType: a.damage_type ?? "",
          location: a.location ?? "",
          severity: SEVERITY[a.severity] ?? a.severity ?? "",
          // Luna reports no confidence score, so we surface what it does report.
          likelyNew: Boolean(a.likely_new),
          surveyMatch: a.matches_known_damage || d.survey_match || "Not found",
          claims: a.claims_description ?? "",
        }
      : null,
    timeline: events
      .filter((e) => e.discrepancy_id === d.discrepancy_id)
      .map((e) => ({ id: `${e.ts}-${e.event_type}`, at: hhmm(e.ts), kind: KIND[e.event_type] ?? "system", ...describe(e) })),
  };
}

/** The move picker. */
consoleApi.get("/api/console/moves", async (c) =>
  c.json({
    moves: (await listMoves()).map((m) => ({
      id: m.move_id, customer: m.customer_name, address: m.address,
      date: m.move_date, status: m.status,
    })),
  }));

/** Everything the console renders for one move, in one round trip. */
consoleApi.get("/api/console/:moveId", async (c) => {
  const moveId = c.req.param("moveId");
  const move = await getMove(moveId);
  if (!move) return c.json({ error: "not_found" }, 404);

  const [boxes, items, discrepancies, events] = await Promise.all([
    listBoxes(moveId), listItems(moveId), listDiscrepancies(moveId), listEvents(moveId, 120),
  ]);

  const byBox = new Map<string, ItemRow[]>();
  for (const i of items) {
    byBox.set(i.box_id, [...(byBox.get(i.box_id) ?? []), i]);
  }

  const shaped = discrepancies.map((d) => shapeDiscrepancy(d, items, boxes, events));
  const openBoxIds = new Set(
    shaped.filter((d) => d.status !== "confirmed" && d.status !== "pre_existing").map((d) => d.boxId),
  );

  return c.json({
    move: {
      id: move.move_id,
      customer: move.customer_name,
      address: move.address,
      date: move.move_date,
      status: move.status,
      survey: parseSurvey(move),
      customerToken: move.customer_token,
      packerToken: move.packer_token,
      customerChatBound: move.customer_chat_id !== "",
    },
    boxes: boxes.map((b) => {
      const contents = byBox.get(b.box_id) ?? [];
      return {
        id: b.box_id,
        number: boxNumber(b.box_id),
        room: b.room,
        items: contents.map((i) => i.name),
        fragile: b.fragile === 1,
        highValue: b.high_value === 1,
        status: b.status,
        photos: shaped.filter((d) => d.boxId === b.box_id && d.photoUrl).length,
        loggedAt: hhmm(b.updated_at),
        flagged: openBoxIds.has(b.box_id),
      };
    }),
    discrepancies: shaped,
    feed: events.map((e) => ({
      id: `${e.ts}-${e.event_type}-${e.item_id || e.box_id || ""}`,
      at: hhmm(e.ts),
      kind: KIND[e.event_type] ?? "system",
      ...describe(e),
    })),
    voice: voiceState(moveId),
    counts: {
      boxesClosed: boxes.filter((b) => b.status === "closed").length,
      boxesOpen: boxes.filter((b) => b.status !== "closed").length,
      items: items.length,
      openDiscrepancies: shaped.filter((d) => d.status === "pending" || d.status === "awaiting_photo").length,
    },
  });
});
