import type { ChannelTool } from "@copilotkit/channels";
import { callTool, toolsFor } from "../tools/index.js";
import type { Surface, ToolContext } from "../tools/types.js";

/**
 * Expose the shared tool registry to a channel agent.
 *
 * The move id is bound here, never taken from model arguments — that is what
 * keeps a customer's agent inside their own move no matter what the model asks
 * for (PLAN §7).
 */
export function channelTools(surface: Surface, ctx: ToolContext): ChannelTool[] {
  return toolsFor(surface).map((spec) => ({
    name: spec.name,
    description: spec.description,
    parameters: spec.schema as ChannelTool["parameters"],
    handler: (args: unknown) => callTool(spec.name, args, ctx),
  }));
}
