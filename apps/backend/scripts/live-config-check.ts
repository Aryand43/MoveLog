/**
 * Validate the Live session config without a browser. The SDP below is a
 * syntactically valid offer but has no real ICE path, so the transport leg is
 * expected to fail — what we're checking is that the session config, model
 * names, delegation block and tool JSON schemas are accepted.
 */
import { env } from "../src/env.js";
import { jsonSchemaFor, toolsFor } from "../src/tools/index.js";
import { BACKEND_PROMPT, VOICE_PROMPT } from "../src/live/prompts.js";

const sdp = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=msid-semantic: WMS",
  "m=audio 9 UDP/TLS/RTP/SAVPF 111",
  "c=IN IP4 0.0.0.0",
  "a=rtcp:9 IN IP4 0.0.0.0",
  "a=ice-ufrag:4ZcD",
  "a=ice-pwd:2/1muCWoOi3uLifh0NuRHlZ6",
  "a=fingerprint:sha-256 4A:AD:B9:B1:3F:82:18:3B:54:02:12:DF:3E:5D:49:6B:19:E5:7C:AB:3A:CD:1E:34:36:2B:57:2E:59:5A:29:5C",
  "a=setup:actpass",
  "a=mid:0",
  "a=sendrecv",
  "a=rtcp-mux",
  "a=rtpmap:111 opus/48000/2",
  "",
].join("\r\n");

const tools = toolsFor("voice").map((t) => ({
  type: "function" as const,
  name: t.name,
  description: t.description,
  parameters: jsonSchemaFor(t),
}));

console.log(`voice tools: ${tools.map((t) => t.name).join(", ")}`);

const res = await fetch("https://api.openai.com/v1/live/sessions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
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
          tools,
        },
      },
    },
    transport: { type: "webrtc", sdp },
  }),
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text.slice(0, 900));
