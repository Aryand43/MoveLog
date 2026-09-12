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
import { startChannels, stopChannels } from "./channels/telegram.js";
import { postDiscrepancyCard } from "./channels/post.js";

const app = new Hono();

// The Next.js app lives on Vercel, so every browser call is cross-origin.
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

app.get("/health", (c) => c.json({ ok: true, base_url: baseUrl }));

// Telegram must be able to fetch damage photos from here.
app.use("/photos/*", serveStatic({ root: env.PHOTOS_DIR, rewriteRequestPath: (p) => p.replace(/^\/photos/, "") }));

app.route("/", api);

// Phase 1 acceptance probe: posts a card with a real photo URL and three buttons.
app.post("/internal/test-card", async (c) => {
  const ref = await postDiscrepancyCard({
    discrepancy: {
      discrepancy_id: "test-001", move_id: "TAN-001", item_name: "leather sofa",
      description: "tear on the left armrest", state: "assessed", survey_match: "",
      photo_url: "", assessment: "{}", packer_confirmed: 0, decision: "", decided_by: "",
      telegram_message_id: "", updated_at: "",
    },
    assessment: {
      damage_type: "tear", location: "left armrest", severity: "moderate",
      likely_new: true, matches_known_damage: "",
      claims_description: "A 10cm tear to the left armrest upholstery, not present on the pre-move survey.",
    },
    photoUrl: "https://picsum.photos/seed/movelog/800/500",
  });
  return c.json({ posted: ref !== null, ref });
});

async function main(): Promise<void> {
  await mkdir(env.PHOTOS_DIR, { recursive: true });

  await ping();
  console.log("[boot] clickhouse ok");

  await applySchema();
  console.log("[boot] schema applied");

  await seed();

  await startChannels();

  serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
    console.log(`[boot] ready on :${info.port} — public ${baseUrl}`);
  });

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      void stopChannels().finally(() => process.exit(0));
    });
  }
}

main().catch((err) => {
  console.error("[boot] failed:", err);
  process.exit(1);
});
