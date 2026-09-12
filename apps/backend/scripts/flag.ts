/** Open a discrepancy and print its id, so the photo route can be exercised. */
import { callTool } from "../src/tools/index.js";
import { DEMO_MOVE_ID } from "../src/db/seed.js";

const r = await callTool(
  "flag_discrepancy",
  { item: "leather sofa", damage: "tear on the left armrest" },
  { moveId: DEMO_MOVE_ID, actorId: "A", actorType: "packer", utterance: "the sofa has a tear" },
);
console.log(JSON.stringify(r));
