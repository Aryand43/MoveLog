import { getMove, upsertMove } from "./queries.js";
import type { SurveyEntry } from "./types.js";

export const DEMO_MOVE_ID = "TAN-001";

const survey: SurveyEntry[] = [
  { item: "oak dresser", room: "bedroom", known_damage: "scratch left side" },
  { item: "dining table", room: "dining", known_damage: "chip on corner" },
  { item: "55 inch tv", room: "living", known_damage: "" },
  { item: "leather sofa", room: "living", known_damage: "" },
  { item: "bookshelf", room: "living", known_damage: "" },
  { item: "kitchen glassware", room: "kitchen", known_damage: "" },
  { item: "blender", room: "kitchen", known_damage: "" },
  { item: "microwave", room: "kitchen", known_damage: "" },
  { item: "queen mattress", room: "bedroom", known_damage: "" },
  { item: "floor lamp", room: "living", known_damage: "" },
];

/** Idempotent: only writes when the demo move is missing. */
export async function seed(): Promise<void> {
  if (await getMove(DEMO_MOVE_ID)) return;
  await upsertMove({
    move_id: DEMO_MOVE_ID,
    customer_name: "Tan Wei Ling",
    address: "12 Everton Park, #04-21, Singapore 080012",
    move_date: new Date().toISOString().slice(0, 10),
    status: "planned",
    survey: JSON.stringify(survey),
    customer_token: "cust-tan001",
    packer_token: "pack-tan001",
    customer_chat_id: "",
  });
  console.log(`[seed] created demo move ${DEMO_MOVE_ID}`);
}
