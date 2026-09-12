import { mkdir } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { baseUrl, env } from "./env.js";
import { ping } from "./db/client.js";
import { applySchema } from "./db/queries.js";
import { seed } from "./db/seed.js";
import { api } from "./http/api.js";

const app = new Hono();

// The Next.js app lives on Vercel, so every browser call is cross-origin.
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

app.get("/health", (c) => c.json({ ok: true, base_url: baseUrl }));

// Telegram must be able to fetch damage photos from here.
app.use("/photos/*", serveStatic({ root: env.PHOTOS_DIR, rewriteRequestPath: (p) => p.replace(/^\/photos/, "") }));

app.route("/", api);

async function main(): Promise<void> {
  await mkdir(env.PHOTOS_DIR, { recursive: true });

  await ping();
  console.log("[boot] clickhouse ok");

  await applySchema();
  console.log("[boot] schema applied");

  await seed();

  serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
    console.log(`[boot] ready on :${info.port} — public ${baseUrl}`);
  });
}

main().catch((err) => {
  console.error("[boot] failed:", err);
  process.exit(1);
});
