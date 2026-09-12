import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { env } from "../env.js";
import { insertEvent } from "../db/queries.js";
import { callTool } from "../tools/index.js";
import { registerSession, unregisterSession } from "./registry.js";

const ATTACH_URL = (sessionId: string) =>
  `wss://api.openai.com/v1/live/sessions/${sessionId}/attach`;

const MAX_RECONNECTS = 5;

/** Log each Live event type once so unknown events are visible (PLAN §10). */
const seenEventTypes = new Set<string>();
function noteEventType(type: string): void {
  if (seenEventTypes.has(type)) return;
  seenEventTypes.add(type);
  console.log(`[live] event type seen: ${type}`);
}

interface PendingCall {
  call_id: string;
  name: string;
  arguments: string;
}

export interface AttachInput {
  sessionId: string;
  moveId: string;
  packerId: string;
  opening: string;
}

/**
 * Attach the server-side sideband to a running Live session and drive the
 * delegated function-call loop. Reconnects on drop — a dead socket means the
 * packer keeps talking into a log that is no longer writing.
 */
export async function attachSideband(input: AttachInput): Promise<void> {
  let attempts = 0;
  let closedByUs = false;

  const connect = (): void => {
    const ws = new WebSocket(ATTACH_URL(input.sessionId), {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    });

    const send = (payload: Record<string, unknown>): void => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event_id: randomUUID(), ...payload }));
      }
    };

    ws.on("open", () => {
      attempts = 0;
      console.log(`[live] sideband attached for ${input.moveId} (${input.sessionId})`);

      // Silent context: the model may use it but must not read it aloud.
      send({
        type: "session.thinking.append",
        delegation_id: null,
        content: input.opening,
      });

      registerSession({
        sessionId: input.sessionId,
        moveId: input.moveId,
        packerId: input.packerId,
        loggingPaused: false,
        say: async (text: string) => {
          // Spoken aloud, paraphrased by the voice model. Capped at 500 tokens.
          send({ type: "session.commentary.append", delegation_id: null, content: text });
        },
        think: async (text: string) => {
          send({ type: "session.thinking.append", delegation_id: null, content: text });
        },
        close: () => {
          closedByUs = true;
          ws.close();
        },
      });
    });

    ws.on("message", (raw) => {
      let envelope: Record<string, any>;
      try {
        envelope = JSON.parse(raw.toString()) as Record<string, any>;
      } catch {
        return;
      }

      // Delegated work arrives wrapped in a response.event envelope; dispatch on
      // the inner type. The envelope's delegation_id is not echoed back: session.*
      // appends take it, response.* events reject it.
      const inner = envelope.type === "response.event" ? envelope.event : envelope;
      if (!inner?.type) return;
      noteEventType(envelope.type === "response.event" ? `response.event/${inner.type}` : inner.type);

      if (inner.type === "session.closed") {
        // The packer pressed Stop or the page went away. The session id is dead,
        // so reattaching would just 404 five times.
        closedByUs = true;
        return;
      }

      if (inner.type === "error") {
        console.error(
          `[live] session error for ${input.moveId}:`,
          JSON.stringify(inner.error ?? inner),
        );
        return;
      }

      // A completed function call is the only event that carries call_id, name
      // and arguments together — an arguments-done event alone is not enough.
      if (inner.type === "response.output_item.done" && inner.item?.type === "function_call") {
        void handleCalls([inner.item as PendingCall]);
      }
    });

    ws.on("close", () => {
      // Only clear the registry if it still points at THIS session: pressing
      // Start again registers a new one first, and blindly deleting here would
      // evict the live session and silence the ops decision.
      unregisterSession(input.moveId, input.sessionId);
      if (closedByUs) return;
      if (attempts >= MAX_RECONNECTS) {
        console.error(`[live] sideband for ${input.moveId} gave up after ${attempts} reconnects`);
        return;
      }
      const delay = Math.min(2 ** attempts * 500, 8_000);
      attempts += 1;
      console.warn(`[live] sideband dropped for ${input.moveId}; reconnecting in ${delay}ms`);
      setTimeout(connect, delay);
    });

    // A 404 on attach means the session no longer exists; retrying cannot help.
    ws.on("unexpected-response", (_req, res) => {
      if (res.statusCode === 404) {
        closedByUs = true;
        console.warn(`[live] session ${input.sessionId} is gone (404); not reattaching`);
      }
    });

    ws.on("error", (err) => {
      console.error(`[live] sideband error for ${input.moveId}:`, err.message);
    });

    /**
     * Execute the calls, submit every result, then continue. All pending results
     * must be submitted before response.create or the backend model stalls.
     */
    async function handleCalls(calls: PendingCall[]): Promise<void> {
      for (const call of calls) {
        let args: unknown = {};
        try {
          args = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          // Leave args empty; callTool's schema check turns this into a
          // needs_review row rather than a dropped utterance.
        }

        const result = await callTool(call.name, args, {
          moveId: input.moveId,
          actorId: input.packerId,
          actorType: "packer",
        });

        // No delegation_id here: the API rejects it on response.* events with
        // "Unknown parameter: 'delegation_id'", which silently swallowed every
        // tool result — writes still happened, but the model never heard back.
        send({
          type: "response.item.create",
          item: {
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(result),
          },
        });
      }

      send({ type: "response.create" });
    }
  };

  connect();
}

/** Close a session's sideband and record the end of the shift. */
export async function endSession(moveId: string, packerId = "A"): Promise<void> {
  await insertEvent({
    move_id: moveId, actor_id: packerId, actor_type: "packer", event_type: "session_ended",
  });
  unregisterSession(moveId);
}
