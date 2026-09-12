import {
  Actions, Button, Divider, Field, Fields, Header, Image, Markdown, Message, Section,
} from "@copilotkit/channels";
import type { DiscrepancyRow } from "../db/types.js";

export interface Assessment {
  damage_type: string;
  location: string;
  severity: string;
  likely_new: boolean;
  matches_known_damage: string;
  claims_description: string;
}

export const DECISIONS = [
  { key: "wrap_and_load", label: "Wrap & load" },
  { key: "hold", label: "Hold" },
  { key: "claim", label: "Open claim" },
] as const;

export type DecisionKey = (typeof DECISIONS)[number]["key"];

/**
 * Telegram caps callback_data at 64 bytes, and the renderer uses
 * `JSON.stringify(button.value)` as the callback data when no action registry has
 * bound the tree — which is our case, since we post these cards proactively.
 * So the button value stays short and the handler is registered under the
 * stringified form.
 */
export const decisionValue = (discrepancyId: string, key: DecisionKey): string =>
  `d|${discrepancyId}|${key}`;

export const decisionCallbackId = (discrepancyId: string, key: DecisionKey): string =>
  JSON.stringify(decisionValue(discrepancyId, key));

export const parseDecisionValue = (
  value: string,
): { discrepancyId: string; key: DecisionKey } | null => {
  const [tag, discrepancyId, key] = value.split("|");
  if (tag !== "d" || !discrepancyId || !key) return null;
  if (!DECISIONS.some((d) => d.key === key)) return null;
  return { discrepancyId, key: key as DecisionKey };
};

export interface DiscrepancyCardProps {
  discrepancy: DiscrepancyRow;
  assessment?: Assessment | null;
  /** Publicly reachable — Telegram fetches this itself. */
  photoUrl?: string;
  /** Known damage from the pre-move survey, if this item appears there. */
  surveyMatch?: string;
}

/** The ops-facing damage card. Buttons disappear once a decision is recorded. */
export function DiscrepancyCard({
  discrepancy, assessment, photoUrl, surveyMatch,
}: DiscrepancyCardProps) {
  const decided = discrepancy.state === "decided" && discrepancy.decision !== "";
  const decisionLabel = DECISIONS.find((d) => d.key === discrepancy.decision)?.label
    ?? discrepancy.decision;

  return (
    <Message>
      <Header>{decided ? "Damage resolved" : "Damage reported"}</Header>
      <Section>
        <Markdown>{`*${discrepancy.item_name}* — move ${discrepancy.move_id}`}</Markdown>
      </Section>
      {photoUrl ? <Image url={photoUrl} alt={`${discrepancy.item_name} damage`} /> : null}
      <Fields>
        <Field label="Reported">{discrepancy.description || "—"}</Field>
        {assessment ? <Field label="Damage">{`${assessment.severity} ${assessment.damage_type}`}</Field> : null}
        {assessment ? <Field label="Location">{assessment.location}</Field> : null}
        {assessment ? <Field label="Pre-existing">{assessment.likely_new ? "No — looks new" : "Possibly"}</Field> : null}
        <Field label="On survey">{surveyMatch || discrepancy.survey_match || "Not on survey"}</Field>
      </Fields>
      {assessment?.claims_description ? (
        <Section>
          <Markdown>{`_${assessment.claims_description}_`}</Markdown>
        </Section>
      ) : null}
      <Divider />
      {decided ? (
        <Section>
          <Markdown>{`✅ *${decisionLabel}* — by ${discrepancy.decided_by || "ops"}`}</Markdown>
        </Section>
      ) : (
        <Actions>
          {DECISIONS.map((d) => (
            <Button key={d.key} value={decisionValue(discrepancy.discrepancy_id, d.key)}>
              {d.label}
            </Button>
          ))}
        </Actions>
      )}
    </Message>
  );
}
