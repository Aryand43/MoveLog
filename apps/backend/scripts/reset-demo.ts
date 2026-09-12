/**
 * Wipe the accumulated test data and re-seed a clean demo move.
 *
 * Tokens are preserved deliberately: the deployed packer URL and the customer
 * deep link are already in circulation, and changing them would break both.
 */
import { ch } from "../src/db/client.js";
import { applySchema, listMoves } from "../src/db/queries.js";
import { DEMO_MOVE_ID, seed } from "../src/db/seed.js";

const TABLES = ["events", "boxes", "items", "discrepancies", "moves"] as const;

await applySchema();

const before = await listMoves();
console.log(`moves before: ${before.map((m) => m.move_id).join(", ") || "(none)"}`);

for (const t of TABLES) {
  await ch.command({ query: `TRUNCATE TABLE IF EXISTS ${t}` });
  console.log(`  truncated ${t}`);
}

await seed();

const after = await listMoves();
console.log(`moves after: ${after.map((m) => `${m.move_id} (${m.status})`).join(", ")}`);
const m = after.find((x) => x.move_id === DEMO_MOVE_ID);
console.log(`packer token: ${m?.packer_token}  customer token: ${m?.customer_token}`);
process.exit(0);
