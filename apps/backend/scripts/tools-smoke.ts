/**
 * Phase 2 acceptance: exercise every tool against the real ClickHouse instance.
 * Run with `npm -w @movelog/backend run smoke`.
 */
import { ping } from "../src/db/client.js";
import { applySchema } from "../src/db/queries.js";
import { DEMO_MOVE_ID, seed } from "../src/db/seed.js";
import { callTool } from "../src/tools/index.js";
import type { ToolContext } from "../src/tools/types.js";

const packer: ToolContext = {
  moveId: DEMO_MOVE_ID, actorId: "A", actorType: "packer", utterance: "(smoke test)",
};
const ops: ToolContext = { moveId: DEMO_MOVE_ID, actorId: "smoke-ops", actorType: "ops" };

let failures = 0;

async function step(label: string, run: () => Promise<unknown>, check?: (r: any) => boolean) {
  try {
    const result = await run();
    const ok = check ? check(result) : true;
    if (!ok) failures += 1;
    console.log(`${ok ? "✓" : "✗"} ${label}\n   ${JSON.stringify(result)}`);
  } catch (err) {
    failures += 1;
    console.log(`✗ ${label}\n   threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

await ping();
await applySchema();
await seed();

const box = `A${Math.floor(Math.random() * 9000) + 1000}`;

await step("log_item — three items into a new box",
  () => callTool("log_item", { box, room: "kitchen", items: ["glasses", "blender", "kettle"], fragile: true }, packer),
  (r) => r.item_count === 3 && r.room === "kitchen");

await step("log_item — no box given, continues the open one",
  () => callTool("log_item", { items: ["chopping board"] }, packer),
  (r) => r.box_id === box);

await step("close_box", () => callTool("close_box", { box }, packer),
  (r) => r.box_id === box && r.item_count === 4);

await step("close_box again — idempotent", () => callTool("close_box", { box }, packer),
  (r) => r.already_closed === true);

await step("find_item 'blender'", () => callTool("find_item", { query: "blender" }, packer),
  // Earlier smoke runs leave their own blenders behind, so assert this run's box
  // is among the matches rather than that it ranks first.
  (r) => r.found === true && r.matches.some((m: any) => m.box_id === box));

await step("check_survey — oak dresser scratch IS on the survey",
  () => callTool("check_survey", { item: "oak dresser", damage: "scratch on the left side" }, packer),
  (r) => r.on_survey === true);

await step("check_survey — sofa tear is NOT on the survey",
  () => callTool("check_survey", { item: "leather sofa", damage: "tear on the armrest" }, packer),
  (r) => r.on_survey === false);

let discrepancyId = "";
await step("flag_discrepancy",
  async () => {
    const r: any = await callTool("flag_discrepancy", { item: "leather sofa", damage: "tear on the left armrest" }, packer);
    discrepancyId = r.discrepancy_id;
    return r;
  },
  (r) => r.status === "photo_requested" && typeof r.discrepancy_id === "string");

await step("resolve_discrepancy",
  () => callTool("resolve_discrepancy", { discrepancy_id: discrepancyId, decision: "wrap_and_load", by: "smoke" }, ops),
  (r) => r.ok === true && r.already_decided === false);

await step("resolve_discrepancy again — idempotent no-op",
  () => callTool("resolve_discrepancy", { discrepancy_id: discrepancyId, decision: "hold", by: "smoke" }, ops),
  (r) => r.already_decided === true && r.decision === "wrap_and_load");

await step("move_status", () => callTool("move_status", {}, packer),
  (r) => typeof r.boxes_closed === "number" && r.items >= 4);

await step("run_select — closed box count",
  () => callTool("run_select", { sql: `SELECT count() AS closed FROM boxes FINAL WHERE move_id = '${DEMO_MOVE_ID}' AND status = 'closed'` }, ops),
  (r) => r.rows.length === 1);

await step("run_select — rejects a write", () => callTool("run_select", { sql: "DROP TABLE items" }, ops),
  (r) => r.error !== undefined && r.logged_as_heard === true);

await step("pause_logging", () => callTool("pause_logging", {}, packer), (r) => r.paused === true);
await step("resume_logging", () => callTool("resume_logging", {}, packer), (r) => r.paused === false);

await step("unknown tool is logged, not thrown", () => callTool("nope", {}, packer),
  (r) => r.logged_as_heard === true);

console.log(failures === 0 ? "\nall tool checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
