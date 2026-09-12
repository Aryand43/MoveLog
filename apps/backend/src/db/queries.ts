import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@clickhouse/client";
import { ch } from "./client.js";
import { env } from "../env.js";
import type {
  ActorType, BoxRow, DiscrepancyRow, EventRow, EventType, ItemRow, MoveRow, SurveyEntry,
} from "./types.js";

/** ClickHouse DateTime64(3) literal. */
export const now = (): string => new Date().toISOString().replace("T", " ").replace("Z", "");

/** Lowercase, strip punctuation, collapse whitespace — the key we fuzzy-match items on. */
export const norm = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export async function applySchema(): Promise<void> {
  // The database itself cannot be created by a client already scoped to it.
  const bootstrap = createClient({
    url: env.CLICKHOUSE_URL,
    username: env.CLICKHOUSE_USER,
    password: env.CLICKHOUSE_PASSWORD,
  });
  await bootstrap.command({ query: `CREATE DATABASE IF NOT EXISTS ${env.CLICKHOUSE_DB}` });
  await bootstrap.close();

  const path = fileURLToPath(new URL("./schema.sql", import.meta.url));
  const sql = await readFile(path, "utf8");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await ch.command({ query: stmt });
  }
}

async function rows<T>(query: string, query_params: Record<string, unknown> = {}): Promise<T[]> {
  const rs = await ch.query({ query, query_params, format: "JSONEachRow" });
  return rs.json<T>();
}

// ---------- events ----------

export async function insertEvent(e: {
  move_id: string;
  actor_id: string;
  actor_type: ActorType;
  event_type: EventType;
  box_id?: string;
  item_id?: string;
  discrepancy_id?: string;
  utterance?: string;
  payload?: unknown;
}): Promise<void> {
  await ch.insert({
    table: "events",
    format: "JSONEachRow",
    values: [{
      ts: now(),
      move_id: e.move_id,
      actor_id: e.actor_id,
      actor_type: e.actor_type,
      event_type: e.event_type,
      box_id: e.box_id ?? "",
      item_id: e.item_id ?? "",
      discrepancy_id: e.discrepancy_id ?? "",
      utterance: e.utterance ?? "",
      payload: JSON.stringify(e.payload ?? {}),
    }],
  });
}

export const listEvents = (move_id: string, limit = 200): Promise<EventRow[]> =>
  rows<EventRow>(
    `SELECT * FROM events WHERE move_id = {move_id:String} ORDER BY ts DESC LIMIT {limit:UInt32}`,
    { move_id, limit },
  );

// ---------- moves ----------

export async function upsertMove(m: Omit<MoveRow, "updated_at">): Promise<void> {
  await ch.insert({ table: "moves", format: "JSONEachRow", values: [{ ...m, updated_at: now() }] });
}

export const getMove = async (move_id: string): Promise<MoveRow | null> =>
  (await rows<MoveRow>(`SELECT * FROM moves FINAL WHERE move_id = {move_id:String}`, { move_id }))[0] ?? null;

export const getMoveByToken = async (
  field: "packer_token" | "customer_token",
  token: string,
): Promise<MoveRow | null> =>
  (await rows<MoveRow>(`SELECT * FROM moves FINAL WHERE ${field} = {token:String}`, { token }))[0] ?? null;

export const listMoves = (): Promise<MoveRow[]> =>
  rows<MoveRow>(`SELECT * FROM moves FINAL ORDER BY move_date DESC`);

export const parseSurvey = (m: MoveRow): SurveyEntry[] => {
  try { return JSON.parse(m.survey) as SurveyEntry[]; } catch { return []; }
};

export async function setMoveStatus(move_id: string, status: MoveRow["status"]): Promise<void> {
  const m = await getMove(move_id);
  if (!m) throw new Error(`unknown move ${move_id}`);
  await upsertMove({ ...m, status });
}

export async function setCustomerChat(move_id: string, chat_id: string): Promise<void> {
  const m = await getMove(move_id);
  if (!m) throw new Error(`unknown move ${move_id}`);
  await upsertMove({ ...m, customer_chat_id: chat_id });
}

export const moveForChat = async (chat_id: string): Promise<MoveRow | null> =>
  (await rows<MoveRow>(
    `SELECT * FROM moves FINAL WHERE customer_chat_id = {chat_id:String} LIMIT 1`, { chat_id },
  ))[0] ?? null;

// ---------- boxes ----------

export async function upsertBox(b: Omit<BoxRow, "updated_at">): Promise<void> {
  await ch.insert({ table: "boxes", format: "JSONEachRow", values: [{ ...b, updated_at: now() }] });
}

export const getBox = async (move_id: string, box_id: string): Promise<BoxRow | null> =>
  (await rows<BoxRow>(
    `SELECT * FROM boxes FINAL WHERE move_id = {move_id:String} AND box_id = {box_id:String}`,
    { move_id, box_id },
  ))[0] ?? null;

export const listBoxes = (move_id: string): Promise<BoxRow[]> =>
  rows<BoxRow>(`SELECT * FROM boxes FINAL WHERE move_id = {move_id:String} ORDER BY box_id`, { move_id });

/** The packer's currently open box, most recent first. */
export const openBox = async (move_id: string, packer_id: string): Promise<BoxRow | null> =>
  (await rows<BoxRow>(
    `SELECT * FROM boxes FINAL
     WHERE move_id = {move_id:String} AND packer_id = {packer_id:String} AND status = 'open'
     ORDER BY updated_at DESC LIMIT 1`,
    { move_id, packer_id },
  ))[0] ?? null;

/** Next box number for this packer's letter prefix; no cross-packer coordination. */
export async function nextBoxId(move_id: string, packer_id: string): Promise<string> {
  const r = await rows<{ n: string }>(
    `SELECT max(toUInt32OrZero(substring(box_id, 2))) AS n FROM boxes FINAL
     WHERE move_id = {move_id:String} AND packer_id = {packer_id:String}`,
    { move_id, packer_id },
  );
  return `${packer_id}${Number(r[0]?.n ?? 0) + 1}`;
}

// ---------- items ----------

export async function insertItems(items: Omit<ItemRow, "updated_at">[]): Promise<void> {
  if (items.length === 0) return;
  const updated_at = now();
  await ch.insert({
    table: "items", format: "JSONEachRow",
    values: items.map((i) => ({ ...i, updated_at })),
  });
}

export const listItems = (move_id: string): Promise<ItemRow[]> =>
  rows<ItemRow>(`SELECT * FROM items FINAL WHERE move_id = {move_id:String}`, { move_id });

export const countItemsInBox = async (move_id: string, box_id: string): Promise<number> => {
  const r = await rows<{ c: string }>(
    `SELECT count() AS c FROM items FINAL WHERE move_id = {move_id:String} AND box_id = {box_id:String}`,
    { move_id, box_id },
  );
  return Number(r[0]?.c ?? 0);
};

/** Substring match on the normalised name; caller ranks and truncates. */
export const searchItems = (move_id: string, q: string, limit = 3): Promise<ItemRow[]> =>
  rows<ItemRow>(
    `SELECT * FROM items FINAL
     WHERE move_id = {move_id:String} AND position(name_norm, {q:String}) > 0
     ORDER BY length(name_norm) ASC LIMIT {limit:UInt32}`,
    { move_id, q: norm(q), limit },
  );

// ---------- discrepancies ----------

export async function upsertDiscrepancy(d: Omit<DiscrepancyRow, "updated_at">): Promise<void> {
  await ch.insert({
    table: "discrepancies", format: "JSONEachRow", values: [{ ...d, updated_at: now() }],
  });
}

export const getDiscrepancy = async (discrepancy_id: string): Promise<DiscrepancyRow | null> =>
  (await rows<DiscrepancyRow>(
    `SELECT * FROM discrepancies FINAL WHERE discrepancy_id = {discrepancy_id:String}`,
    { discrepancy_id },
  ))[0] ?? null;

export const listDiscrepancies = (move_id: string): Promise<DiscrepancyRow[]> =>
  rows<DiscrepancyRow>(
    `SELECT * FROM discrepancies FINAL WHERE move_id = {move_id:String} ORDER BY updated_at DESC`,
    { move_id },
  );
