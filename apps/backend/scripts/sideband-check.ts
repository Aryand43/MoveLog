/**
 * Create a Live session, attach the server-side sideband, and drive it the way
 * the ops decision does. No browser and no audio, so no function calls fire —
 * this checks the attach URL, auth, and that our steering events are accepted.
 */
import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { env } from "../src/env.js";
import { jsonSchemaFor, toolsFor } from "../src/tools/index.js";
import { BACKEND_PROMPT, VOICE_PROMPT } from "../src/live/prompts.js";

const sdp = [
  "v=0", "o=- 4611731400430051336 2 IN IP4 127.0.0.1", "s=-", "t=0 0",
  "a=group:BUNDLE 0", "a=msid-semantic: WMS",
  "m=audio 9 UDP/TLS/RTP/SAVPF 111", "c=IN IP4 0.0.0.0", "a=rtcp:9 IN IP4 0.0.0.0",
  "a=ice-ufrag:4ZcD", "a=ice-pwd:2/1muCWoOi3uLifh0NuRHlZ6",
  "a=fingerprint:sha-256 4A:AD:B9:B1:3F:82:18:3B:54:02:12:DF:3E:5D:49:6B:19:E5:7C:AB:3A:CD:1E:34:36:2B:57:2E:59:5A:29:5C",
  "a=setup:actpass", "a=mid:0", "a=sendrecv", "a=rtcp-mux", "a=rtpmap:111 opus/48000/2", "",
].join("\r\n");

const create = await fetch("https://api.openai.com/v1/live/sessions", {
  method: "POST",
  headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    session: {
      model: "gpt-live-1",
      instructions: VOICE_PROMPT,
      delegation: {
        type: "responses",
        responses: {
          model: "gpt-5.6-luna",
          instructions: BACKEND_PROMPT,
          reasoning: { effort: "low" },
          tools: toolsFor("voice").map((t) => ({
            type: "function" as const, name: t.name, description: t.description,
            parameters: jsonSchemaFor(t),
          })),
        },
      },
    },
    transport: { type: "webrtc", sdp },
  }),
});

const { session } = (await create.json()) as { session: { id: string } };
console.log(`session: ${session.id}`);

const ws = new WebSocket(`wss://api.openai.com/v1/live/sessions/${session.id}/attach`, {
  headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
});

const send = (p: Record<string, unknown>) => ws.send(JSON.stringify({ event_id: randomUUID(), ...p }));

ws.on("open", () => {
  console.log("sideband OPEN");
  send({ type: "session.thinking.append", delegation_id: null, content: "Move TAN-001. Box A12 is open." });
  setTimeout(() => {
    console.log("sending commentary (this is what an ops decision does)");
    send({ type: "session.commentary.append", delegation_id: null, content: "Ops says wrap it and load it." });
  }, 1500);
});

ws.on("message", (raw) => {
  const e = JSON.parse(raw.toString()) as Record<string, any>;
  const inner = e.type === "response.event" ? e.event : e;
  console.log(`  <- ${e.type}${e.type === "response.event" ? `/${inner?.type}` : ""}${inner?.error ? ` ERROR ${JSON.stringify(inner.error)}` : ""}`);
});

ws.on("error", (err) => console.log(`sideband ERROR: ${err.message}`));
ws.on("close", (code) => console.log(`sideband CLOSED ${code}`));

setTimeout(() => { ws.close(); process.exit(0); }, 12_000);
