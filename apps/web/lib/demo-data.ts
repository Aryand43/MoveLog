/**
 * Sample data for the MoveLog console demo. Everything here is fictional and
 * lives in memory. The console runs with no backend.
 *
 * The ops channel name is a single constant so it can be switched to the
 * Telegram group the backend actually posts to (see apps/backend/src/channels).
 */
export const OPS_CHANNEL = "#ops-moves";
export const OPS_SURFACE = "Slack";

export type VoiceStatus = "idle" | "listening" | "processing";
export type Connection = "online" | "reconnecting" | "offline";
export type EventKind = "voice" | "log" | "photo" | "ai" | "human" | "ops" | "system";

export interface FeedEvent {
  id: string;
  at: string;
  kind: EventKind;
  text: string;
  detail?: string;
}

export interface Box {
  id: string;
  number: number;
  room: string;
  items: string[];
  fragile: boolean;
  photos: number;
  loggedAt: string;
  flagged?: boolean;
}

export interface Assessment {
  damageType: string;
  location: string;
  severity: "Minor" | "Moderate" | "Severe";
  surveyMatch: string;
  confidence: number;
}

export type DiscrepancyStatus = "pending" | "confirmed" | "pre_existing" | "awaiting_photo";

export interface Discrepancy {
  id: string;
  title: string;
  item: string;
  boxNumber: number;
  room: string;
  reportedAt: string;
  status: DiscrepancyStatus;
  assessment: Assessment;
  photoRequests: number;
  decidedBy?: string;
  timeline: FeedEvent[];
}

export interface OpsNotification {
  id: string;
  at: string;
  channel: string;
  title: string;
  body: string;
  status: "sent" | "sending" | "failed";
}

export interface CrewMember {
  name: string;
  initials: string;
  role: string;
  online: boolean;
}

export const MOVE = {
  id: "MV-2291",
  name: "Davis Family Move",
  address: "18 Marlowe Crescent → 402 Ridgeway Park",
  date: "12 September 2026",
  boxesTotal: 32,
};

export const CREW: CrewMember[] = [
  { name: "Alex Rivera", initials: "AR", role: "Lead packer", online: true },
  { name: "Priya Nair", initials: "PN", role: "Ops coordinator", online: true },
  { name: "Sam Doyle", initials: "SD", role: "Packer", online: false },
];

export const ROOMS = [
  { name: "Living Room", status: "done" as const, boxes: 7 },
  { name: "Kitchen", status: "done" as const, boxes: 6 },
  { name: "Bedroom", status: "done" as const, boxes: 5 },
  { name: "Home Office", status: "active" as const, boxes: 0 },
  { name: "Garage", status: "pending" as const, boxes: 0 },
];

const box = (
  number: number,
  room: string,
  items: string[],
  fragile: boolean,
  photos: number,
  loggedAt: string
): Box => ({ id: `box-${number}`, number, room, items, fragile, photos, loggedAt });

export const BOXES: Box[] = [
  box(1, "Living Room", ["Books (hardback)", "Photo frames", "Throw blankets"], false, 1, "08:42"),
  box(2, "Living Room", ["Table lamp", "Lampshade", "Extension lead"], true, 2, "08:51"),
  box(3, "Living Room", ["DVDs", "Games console", "Controllers"], false, 1, "09:00"),
  box(4, "Living Room", ["Vinyl records", "Turntable mat"], true, 2, "09:06"),
  box(5, "Living Room", ["Cushions", "Curtains"], false, 0, "09:11"),
  box(6, "Living Room", ["Bookends", "Desk clock", "Candle holders"], true, 1, "09:17"),
  box(7, "Living Room", ["Router", "Modem", "Network cables"], false, 1, "09:21"),
  box(8, "Kitchen", ["Dinner plates", "Side plates", "Bowls"], true, 2, "09:26"),
  box(9, "Kitchen", ["Saucepans", "Frying pans", "Lids"], false, 1, "09:31"),
  box(10, "Kitchen", ["Wine glasses", "Tumblers"], true, 3, "09:35"),
  box(11, "Kitchen", ["Cutlery tray", "Utensils", "Chopping boards"], false, 1, "09:38"),
  box(12, "Kitchen", ["Mixing bowls", "Baking trays", "Scales"], false, 1, "09:41"),
  box(13, "Bedroom", ["Bed linen", "Pillowcases", "Duvet cover"], false, 0, "09:44"),
  box(14, "Kitchen", ["Phone chargers", "Coffee machine", "Coffee beans"], true, 2, "09:47"),
  box(15, "Bedroom", ["Winter coats", "Boots"], false, 1, "09:52"),
  box(16, "Bedroom", ["Jewellery box", "Perfume bottles", "Mirror tray"], true, 3, "09:56"),
  box(17, "Bedroom", ["Shoes", "Belts", "Scarves"], false, 0, "10:01"),
  box(18, "Bedroom", ["Bedside lamp", "Alarm clock", "Books"], true, 1, "10:05"),
];

export const INITIAL_TRANSCRIPT = "Box 14, kitchen, chargers and coffee machine, fragile.";
export const INITIAL_REPLY = "Box 14 logged.";

/** Scripted voice turns, cycled by Push to Talk. */
export const VOICE_SCRIPT: {
  transcript: string;
  reply: string;
  box?: { number: number; room: string; items: string[]; fragile: boolean };
}[] = [
  {
    transcript: "Box 19, home office, printer paper, stapler, and the desk organiser.",
    reply: "Box 19 logged. Three items, home office.",
    box: { number: 19, room: "Home Office", items: ["Printer paper", "Stapler", "Desk organiser"], fragile: false },
  },
  {
    transcript: "Where did the router go?",
    reply: "Box 7, living room. Logged at 09:21.",
  },
  {
    transcript: "Box 20, home office, two monitors and the docking station. Fragile.",
    reply: "Box 20 logged. Marked fragile.",
    box: { number: 20, room: "Home Office", items: ["Monitor (27in)", "Monitor (24in)", "Docking station"], fragile: true },
  },
  {
    transcript: "Box 21, home office, cable box, spare keyboards, mouse mats.",
    reply: "Box 21 logged. Three items, home office.",
    box: { number: 21, room: "Home Office", items: ["Cable box", "Spare keyboards", "Mouse mats"], fragile: false },
  },
];

export const INITIAL_FEED: FeedEvent[] = [
  { id: "f-1", at: "09:47", kind: "voice", text: "Voice input received", detail: INITIAL_TRANSCRIPT },
  { id: "f-2", at: "09:47", kind: "log", text: "Box 14 logged", detail: "Kitchen · 3 items · fragile" },
  { id: "f-3", at: "09:49", kind: "photo", text: "Photo captured", detail: "Coffee machine, front panel" },
  { id: "f-4", at: "09:49", kind: "ai", text: "AI assessment returned", detail: "Scratch · minor · 87% confidence" },
  { id: "f-5", at: "09:50", kind: "system", text: "Discrepancy opened", detail: "Awaiting human confirmation" },
  { id: "f-6", at: "10:05", kind: "log", text: "Box 18 logged", detail: "Bedroom · 3 items · fragile" },
];

export const INITIAL_DISCREPANCY: Discrepancy = {
  id: "d-1",
  title: "Scratch found on coffee machine",
  item: "Coffee machine",
  boxNumber: 14,
  room: "Kitchen",
  reportedAt: "09:49",
  status: "pending",
  photoRequests: 1,
  assessment: {
    damageType: "Scratch",
    location: "Front panel",
    severity: "Minor",
    surveyMatch: "Not found",
    confidence: 87,
  },
  timeline: [
    { id: "t-1", at: "09:47", kind: "voice", text: "Voice input", detail: INITIAL_TRANSCRIPT },
    { id: "t-2", at: "09:47", kind: "log", text: "Item logged", detail: "Coffee machine → Box 14, Kitchen" },
    { id: "t-3", at: "09:48", kind: "system", text: "Photo requested", detail: "Damage reported, not on pre-move survey" },
    { id: "t-4", at: "09:49", kind: "photo", text: "Photo received", detail: "1 image · 2.1 MB" },
    { id: "t-5", at: "09:49", kind: "ai", text: "AI assessment", detail: "Scratch · front panel · minor · 87%" },
  ],
};

/** Pre-existing damage recorded on the pre-move survey. */
export const SURVEY_DAMAGE = [
  { item: "Oak dresser", note: "Scratch, left side panel", room: "Bedroom" },
  { item: "Dining table", note: "Chip on corner", room: "Kitchen" },
];
