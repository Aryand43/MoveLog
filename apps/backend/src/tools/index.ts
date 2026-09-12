import { z } from "zod";
import { insertEvent } from "../db/queries.js";
import { checkSurvey, checkSurveySchema } from "./check_survey.js";
import { closeBox, closeBoxSchema } from "./close_box.js";
import { findItem, findItemSchema } from "./find_item.js";
import { flagDiscrepancy, flagDiscrepancySchema } from "./flag_discrepancy.js";
import { logItem, logItemSchema } from "./log_item.js";
import { moveComplete, moveCompleteSchema } from "./move_complete.js";
import { moveStatus, moveStatusSchema } from "./move_status.js";
import { pauseLogging, pauseLoggingSchema, resumeLogging } from "./pause_logging.js";
import { resolveDiscrepancy, resolveDiscrepancySchema } from "./resolve_discrepancy.js";
import { runSelect, runSelectSchema } from "./run_select.js";
import type { Surface, ToolContext } from "./types.js";

export interface ToolSpec {
  name: string;
  description: string;
  schema: z.ZodType;
  surfaces: Surface[];
  handler: (args: never, ctx: ToolContext) => Promise<unknown>;
}

/** One registry, three surfaces — the same handlers back earbuds, ops and customer. */
export const TOOLS: ToolSpec[] = [
  {
    name: "log_item",
    description:
      "Record items going into a box. Use for every box/item the packer narrates. " +
      "Omit `box` to keep filling the box that is already open.",
    schema: logItemSchema,
    surfaces: ["voice"],
    handler: logItem as ToolSpec["handler"],
  },
  {
    name: "close_box",
    description: "Close a box once it is sealed. Omit `box` to close the open one.",
    schema: closeBoxSchema,
    surfaces: ["voice"],
    handler: closeBox as ToolSpec["handler"],
  },
  {
    name: "check_survey",
    description:
      "Check whether reported damage was already on the pre-move survey. " +
      "Always call this before flag_discrepancy.",
    schema: checkSurveySchema,
    surfaces: ["voice"],
    handler: checkSurvey as ToolSpec["handler"],
  },
  {
    name: "flag_discrepancy",
    description:
      "Open a damage record for damage that is NOT on the survey, and ask the packer's " +
      "phone for a photo. Only call after check_survey returned on_survey false.",
    schema: flagDiscrepancySchema,
    surfaces: ["voice"],
    handler: flagDiscrepancy as ToolSpec["handler"],
  },
  {
    name: "find_item",
    description: "Find which box an item was packed into.",
    schema: findItemSchema,
    surfaces: ["voice", "ops", "customer"],
    handler: findItem as ToolSpec["handler"],
  },
  {
    name: "move_status",
    description: "Progress on the move: boxes, items, rooms finished, open damage reports.",
    schema: moveStatusSchema,
    surfaces: ["voice", "ops", "customer"],
    handler: moveStatus as ToolSpec["handler"],
  },
  {
    name: "move_complete",
    description:
      "Mark the move finished once everything is packed and loaded. Returns the customer's " +
      "handover link. Only call when the packer says the move or the job is complete.",
    schema: moveCompleteSchema,
    surfaces: ["voice"],
    handler: moveComplete as ToolSpec["handler"],
  },
  {
    name: "run_select",
    description:
      "Run a read-only SELECT against the movelog ClickHouse database for questions " +
      "find_item and move_status cannot answer. Use FINAL on ReplacingMergeTree tables.",
    schema: runSelectSchema,
    surfaces: ["ops"],
    handler: runSelect as ToolSpec["handler"],
  },
  {
    name: "resolve_discrepancy",
    description: "Record the ops decision on a damage report and speak it to the packer.",
    schema: resolveDiscrepancySchema,
    surfaces: ["ops"],
    handler: resolveDiscrepancy as ToolSpec["handler"],
  },
  {
    name: "pause_logging",
    description: "Stop logging until resumed — the packer is talking to someone else.",
    schema: pauseLoggingSchema,
    surfaces: ["voice"],
    handler: pauseLogging as ToolSpec["handler"],
  },
  {
    name: "resume_logging",
    description: "Resume logging after a pause.",
    schema: pauseLoggingSchema,
    surfaces: ["voice"],
    handler: resumeLogging as ToolSpec["handler"],
  },
];

export const toolsFor = (surface: Surface): ToolSpec[] =>
  TOOLS.filter((t) => t.surfaces.includes(surface));

export const getTool = (name: string): ToolSpec | undefined =>
  TOOLS.find((t) => t.name === name);

const TIMEOUT_MS = 5_000;

export interface ToolFailure {
  error: string;
  logged_as_heard: true;
}

/**
 * Never drop an utterance (PLAN §10). Any failure — bad arguments, a timeout, a
 * ClickHouse blip — still lands an events row marked needs_review and returns a
 * short string the voice model can say, instead of silently losing what the
 * packer just narrated.
 */
export async function callTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<unknown | ToolFailure> {
  const tool = getTool(name);
  if (!tool) return failure(name, ctx, `unknown tool ${name}`, rawArgs);

  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return failure(name, ctx, `invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`, rawArgs);
  }

  try {
    return await Promise.race([
      tool.handler(parsed.data as never, ctx),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${name} timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS),
      ),
    ]);
  } catch (err) {
    return failure(name, ctx, err instanceof Error ? err.message : String(err), rawArgs);
  }
}

async function failure(
  name: string,
  ctx: ToolContext,
  message: string,
  rawArgs: unknown,
): Promise<ToolFailure> {
  console.error(`[tools] ${name} failed for ${ctx.moveId}: ${message}`);
  try {
    await insertEvent({
      move_id: ctx.moveId,
      actor_id: ctx.actorId,
      actor_type: ctx.actorType,
      event_type: "needs_review",
      utterance: ctx.utterance,
      payload: { tool: name, error: message, args: rawArgs, needs_review: 1 },
    });
  } catch (err) {
    // The log of last resort — if ClickHouse is down we still must not throw
    // into the voice loop.
    console.error("[tools] could not record needs_review:", err);
  }
  return { error: message, logged_as_heard: true };
}

/** JSON Schema for the OpenAI Live delegation function definitions. */
export const jsonSchemaFor = (tool: ToolSpec): Record<string, unknown> =>
  z.toJSONSchema(tool.schema, { io: "input" }) as Record<string, unknown>;
