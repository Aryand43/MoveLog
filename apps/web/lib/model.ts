/** Shapes returned by GET /api/console/:moveId. Mirrors the backend exactly. */

export const OPS_SURFACE = "Telegram";
export const OPS_CHANNEL = "Ops – Moves";

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
  highValue: boolean;
  status: "open" | "closed";
  photos: number;
  loggedAt: string;
  flagged?: boolean;
}

export interface Assessment {
  damageType: string;
  location: string;
  severity: "Minor" | "Moderate" | "Severe" | string;
  /** Luna reports no confidence score, so we surface what it does report. */
  likelyNew: boolean;
  surveyMatch: string;
  claims: string;
}

export type DiscrepancyStatus = "pending" | "confirmed" | "pre_existing" | "awaiting_photo";
export type Decision = "wrap_and_load" | "hold" | "claim";

export interface Discrepancy {
  id: string;
  title: string;
  item: string;
  boxNumber: number;
  boxId: string;
  room: string;
  reportedAt: string;
  status: DiscrepancyStatus;
  decision: string;
  decidedBy?: string;
  photoUrl?: string;
  photoRequests: number;
  assessment: Assessment | null;
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

export interface SurveyEntry {
  item: string;
  room: string;
  known_damage: string;
}

export interface MoveSummary {
  id: string;
  customer: string;
  address: string;
  date: string;
  status: "planned" | "packing" | "complete";
}

export interface MoveDetail extends MoveSummary {
  survey: SurveyEntry[];
  customerToken: string;
  packerToken: string;
  customerChatBound: boolean;
}

export interface Counts {
  boxesClosed: number;
  boxesOpen: number;
  items: number;
  openDiscrepancies: number;
}

export type VoiceStatus = "idle" | "listening" | "processing" | "offline";

export interface VoiceState {
  status: VoiceStatus;
  /** What the packer last said, as the model transcribed it. */
  transcript: string;
  /** The agent's last spoken reply. */
  reply: string;
  at: string;
}

export interface ConsolePayload {
  voice: VoiceState;
  move: MoveDetail;
  boxes: Box[];
  discrepancies: Discrepancy[];
  feed: FeedEvent[];
  counts: Counts;
}

export const DECISION_LABEL: Record<string, string> = {
  wrap_and_load: "Wrap & load",
  hold: "Hold",
  claim: "Open claim",
};
