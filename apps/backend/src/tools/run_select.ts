import { z } from "zod";
import { chReadonly } from "../db/client.js";
import { insertEvent } from "../db/queries.js";
import type { ToolContext } from "./types.js";

export const runSelectSchema = z.object({
  sql: z.string().describe("A single SELECT statement. Use FINAL on ReplacingMergeTree tables."),
});

export type RunSelectArgs = z.infer<typeof runSelectSchema>;

export interface RunSelectResult {
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

const MAX_ROWS = 50;

/** Statement separators and comment markers that could smuggle a second statement. */
const FORBIDDEN = /;|--|\/\*|\binsert\b|\bupdate\b|\bdelete\b|\balter\b|\bdrop\b|\bcreate\b|\btruncate\b|\battach\b|\bgrant\b|\bsystem\b/i;

export async function runSelect(args: RunSelectArgs, ctx: ToolContext): Promise<RunSelectResult> {
  const sql = args.sql.trim().replace(/;\s*$/, "");

  if (!/^(select|with)\b/i.test(sql)) throw new Error("only SELECT statements are allowed");
  if (FORBIDDEN.test(sql)) throw new Error("statement rejected: only a single read-only SELECT is allowed");

  // Belt and braces — the connection is a readonly=1 user with a 5s limit too.
  const rs = await chReadonly.query({
    query: `SELECT * FROM (${sql}) LIMIT ${MAX_ROWS + 1}`,
    format: "JSONEachRow",
    abort_signal: AbortSignal.timeout(5_000),
  });
  const all = await rs.json<Record<string, unknown>>();
  const rows = all.slice(0, MAX_ROWS);

  await insertEvent({
    move_id: ctx.moveId,
    actor_id: ctx.actorId,
    actor_type: ctx.actorType,
    event_type: "query_asked",
    utterance: ctx.utterance,
    payload: { tool: "run_select", sql, rows: rows.length },
  });

  return {
    columns: rows[0] ? Object.keys(rows[0]) : [],
    rows,
    truncated: all.length > MAX_ROWS,
  };
}
