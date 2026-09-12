import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

// The workspace root holds the single .env; the backend runs from apps/backend.
// Never overrides real env vars, so Modal secrets win in production.
config();
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

// Required everywhere. Anything optional is gated by the phase that needs it.
const schema = z.object({
  PORT: z.coerce.number().default(8080),
  PHOTOS_DIR: z.string().default("./photos"),
  PUBLIC_BASE_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().min(1),

  COPILOTKIT_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  OPS_CHAT_ID: z.string().optional(),

  CLICKHOUSE_URL: z.string().min(1),
  CLICKHOUSE_USER: z.string().default("default"),
  CLICKHOUSE_PASSWORD: z.string().default(""),
  CLICKHOUSE_DB: z.string().default("movelog"),
  CLICKHOUSE_RO_USER: z.string().optional(),
  CLICKHOUSE_RO_PASSWORD: z.string().optional(),

  TRIGGER_SECRET_KEY: z.string().optional(),
});

// Treat a blank var as absent — `PUBLIC_BASE_URL=` in .env must not fail .url().
const present = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ""),
);

const parsed = schema.safeParse(present);
if (!parsed.success) {
  console.error("[env] invalid configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

/** Public origin for photo URLs and deep links. Falls back to localhost in dev. */
export const baseUrl = (env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, "");
