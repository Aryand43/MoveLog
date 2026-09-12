import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { env } from "../env.js";
import { CUSTOMER_PROMPT, OPS_PROMPT } from "./prompts.js";

const MODEL = "openai/gpt-5.6-luna";

/**
 * One agent per surface. Tools are supplied per run by the channel handler
 * (`thread.runAgent({ tools })`) so the customer's toolset stays scoped to their
 * own move while ops keep SQL access.
 */
export const opsAgent = new BuiltInAgent({
  model: MODEL,
  apiKey: env.OPENAI_API_KEY,
  prompt: OPS_PROMPT,
  maxSteps: 6,
  providerOptions: { openai: { reasoningEffort: "low" } },
});

export const customerAgent = new BuiltInAgent({
  model: MODEL,
  apiKey: env.OPENAI_API_KEY,
  prompt: CUSTOMER_PROMPT,
  maxSteps: 4,
  providerOptions: { openai: { reasoningEffort: "low" } },
});
