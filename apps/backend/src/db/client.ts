import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { env } from "../env.js";

/** Read/write client. async_insert keeps the voice path from blocking on merges. */
export const ch: ClickHouseClient = createClient({
  url: env.CLICKHOUSE_URL,
  username: env.CLICKHOUSE_USER,
  password: env.CLICKHOUSE_PASSWORD,
  database: env.CLICKHOUSE_DB,
  clickhouse_settings: { async_insert: 1, wait_for_async_insert: 1 },
});

/** Readonly client used only by the ops `run_select` tool. Falls back to the rw user. */
export const chReadonly: ClickHouseClient = env.CLICKHOUSE_RO_USER
  ? createClient({
      url: env.CLICKHOUSE_URL,
      username: env.CLICKHOUSE_RO_USER,
      password: env.CLICKHOUSE_RO_PASSWORD ?? "",
      database: env.CLICKHOUSE_DB,
      clickhouse_settings: { readonly: "1", max_execution_time: 5 },
    })
  : ch;

export async function ping(): Promise<void> {
  const res = await ch.ping();
  if (!res.success) throw res.error;
}
