export type ActorType = "packer" | "ops" | "customer" | "system";

export type EventType =
  | "session_started"
  | "session_ended"
  | "item_logged"
  | "box_opened"
  | "box_closed"
  | "survey_checked"
  | "defect_reported"
  | "discrepancy_opened"
  | "photo_received"
  | "assessment_done"
  | "decision_made"
  | "query_asked"
  | "logging_paused"
  | "logging_resumed"
  | "move_completed"
  | "needs_review";

export interface SurveyEntry {
  item: string;
  room: string;
  known_damage: string;
}

export interface MoveRow {
  move_id: string;
  customer_name: string;
  address: string;
  move_date: string;
  status: "planned" | "packing" | "complete";
  survey: string;
  customer_token: string;
  packer_token: string;
  customer_chat_id: string;
  updated_at: string;
}

export interface BoxRow {
  move_id: string;
  box_id: string;
  room: string;
  fragile: number;
  high_value: number;
  status: "open" | "closed";
  packer_id: string;
  updated_at: string;
}

export interface ItemRow {
  item_id: string;
  move_id: string;
  box_id: string;
  name: string;
  name_norm: string;
  fragile: number;
  updated_at: string;
}

export type DiscrepancyState = "awaiting_photo" | "assessed" | "confirmed" | "decided" | "dismissed";
export type Decision = "wrap_and_load" | "hold" | "claim";

export interface DiscrepancyRow {
  discrepancy_id: string;
  move_id: string;
  item_name: string;
  description: string;
  state: DiscrepancyState;
  survey_match: string;
  photo_url: string;
  assessment: string;
  packer_confirmed: number;
  decision: string;
  decided_by: string;
  telegram_message_id: string;
  updated_at: string;
}

export interface EventRow {
  ts: string;
  move_id: string;
  actor_id: string;
  actor_type: ActorType;
  event_type: EventType;
  box_id: string;
  item_id: string;
  discrepancy_id: string;
  utterance: string;
  payload: string;
}
