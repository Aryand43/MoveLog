import { env } from "../env.js";

export interface Assessment {
  damage_type: "scratch" | "dent" | "crack" | "stain" | "tear" | "break" | "other";
  location: string;
  severity: "cosmetic" | "minor" | "moderate" | "severe";
  likely_new: boolean;
  matches_known_damage: string;
  claims_description: string;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "damage_type", "location", "severity", "likely_new",
    "matches_known_damage", "claims_description",
  ],
  properties: {
    damage_type: {
      type: "string",
      enum: ["scratch", "dent", "crack", "stain", "tear", "break", "other"],
    },
    location: { type: "string", description: "Where on the item the damage is." },
    severity: { type: "string", enum: ["cosmetic", "minor", "moderate", "severe"] },
    likely_new: {
      type: "boolean",
      description: "True when this does not look like the damage already on the survey.",
    },
    matches_known_damage: {
      type: "string",
      description: "The survey entry it may correspond to, or an empty string.",
    },
    claims_description: {
      type: "string",
      description: "One sentence in insurance-claim language.",
    },
  },
} as const;

const TIMEOUT_MS = 15_000;

/**
 * Assess a damage photo. Vision runs on the same model family that backs the
 * voice session, at zero reasoning effort — this is a description task, not a
 * reasoning one, and the packer is waiting.
 */
export async function assessPhoto(input: {
  imageBase64: string;
  mimeType: string;
  itemName: string;
  reportedDamage: string;
  knownDamage: string;
}): Promise<Assessment> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      reasoning: { effort: "none" },
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Item: ${input.itemName}\n` +
              `The packer reported: ${input.reportedDamage}\n` +
              `Damage already on the pre-move survey for this item: ${input.knownDamage || "none"}\n\n` +
              `Assess the damage visible in the photo. Judge likely_new against the survey entry ` +
              `above: if what you see matches it, likely_new is false.`,
          },
          { type: "input_image", image_url: `data:${input.mimeType};base64,${input.imageBase64}` },
        ],
      }],
      text: {
        format: { type: "json_schema", name: "damage_assessment", strict: true, schema: SCHEMA },
      },
    }),
  });

  if (!res.ok) throw new Error(`luna assessment failed (${res.status}): ${await res.text()}`);

  const body = (await res.json()) as {
    output_text?: string;
    output?: { content?: { type: string; text?: string }[] }[];
  };

  const text =
    body.output_text ??
    body.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;

  if (!text) throw new Error("luna returned no assessment text");
  return JSON.parse(text) as Assessment;
}
