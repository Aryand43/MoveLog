# MoveLog — build plan for Claude Code

Hackathon: AI Tinkerers "Agents, Everywhere" (Singapore). Hard deadline in a few hours.
Judging weights: working end-to-end agent inside a real environment, environment materially
shapes the workflow, engineering depth (failure handling, orchestration), usefulness.
Sponsor prize we are targeting: **Best Use of CopilotKit** (via Channels SDK) plus OpenAI/ClickHouse/Trigger.dev usage. Hosting on Modal (own credits).

Read this whole file before writing any code. Phases are strictly ordered. Do not start a
later phase until the acceptance check of the current one passes. When a doc URL is given,
fetch it and use the exact API names from the doc, not from memory — several of these APIs
are days old.

---

## 1. What we are building (one paragraph)

A voice agent for movers and packers. The packer keeps a phone in their pocket with earbuds
and narrates what they pack ("Box twelve, kitchen, glasses, blender, fragile"). GPT-Live-1
handles the conversation and delegates every tool call to our backend, which writes an
append-only record to ClickHouse. When the packer reports damage that is not on the pre-move
survey, the agent asks for a photo, GPT-5.6 Luna assesses it, a card with buttons is posted
to the ops team's Telegram group, and the ops decision is spoken back into the packer's live
session within seconds. At handover the customer gets a Telegram deep link and a web manifest
and can ask the same bot "where are my chargers?". Ops query the ClickHouse data by asking
the bot in their group. **One agent, three surfaces: earbuds, Telegram group, private chat.**

The demo moment is the round trip: packer speaks → card in Telegram → ops taps button →
packer hears the decision. Everything else is supporting cast.

---

## 2. Verified facts from the docs (do not re-derive these)

### GPT-Live-1 — https://developers.openai.com/api/docs/models/gpt-live-1
- Model id `gpt-live-1`. Full-duplex voice model. Audio+text in, audio+text out. **No image input.**
- $0.05/min voice; backend model billed separately.
- Endpoint `v1/live/sessions`. Rate limit is concurrent sessions (25 at tier 1).
- Two prompts: the voice model gets conversational instructions; the backend model gets task
  instructions and the tools. **The voice model never sees tool definitions** — do not
  describe tools in the voice prompt, only say what to delegate.

### Delegation — https://developers.openai.com/api/docs/guides/live-delegation (read fully)
- Use **Responses delegation**: session config
  `{ model: "gpt-live-1", delegation: { type: "responses", responses: { model: "gpt-5.6-luna", instructions, tools: [...function defs...] } } }`
- Our app executes the functions. Flow: read completed function calls from nested
  `response.output_item.done` events (they carry `call_id`, `name`, `arguments`), execute,
  send `response.item.create` with `{ type: "function_call_output", call_id, output }`, then
  send `response.create` to continue. Submit all pending results before continuing.
- Events for delegated work arrive wrapped: `{ type: "response.event", delegation_id, event: {...} }`.
  Dispatch on `envelope.event.type`, preserve outer `delegation_id`.
- To speak text into the session from outside (the ops decision): `session.commentary.append`
  with `{ delegation_id: null, content: "<plain string, <=500 tokens>" }`. Model paraphrases it aloud.
  `session.thinking.append` = quiet context. `session.instructions.append` = redirect behaviour.
- Server-side steering uses a **sideband WebSocket** attached to the running session
  (see https://developers.openai.com/api/docs/guides/voice-server-controls?api=live and
  https://developers.openai.com/api/docs/guides/voice-websockets?api=live).
- Browser client: WebRTC with an ephemeral token minted by our backend
  (https://developers.openai.com/api/docs/guides/live for session creation and
  https://developers.openai.com/api/docs/guides/voice-webrtc for the client). Verify the exact
  ephemeral-token endpoint for Live in those docs.
- Images: send to a vision-capable backend model ourselves, return text to the session via
  commentary.append. Do NOT try to push images into the Live session.
- Prompting guide: https://developers.openai.com/api/docs/guides/live-prompting

### GPT-5.6 Luna — https://developers.openai.com/api/docs/models/gpt-5.6-luna
- `gpt-5.6-luna`. Text+image in, text out. Structured outputs supported. Function calling
  supported. `reasoning.effort` supports `none|low|medium|high|xhigh|max` — use `none` for
  photo assessment, `low` as the Live delegation backend. $0.20/$1.20 per 1M tokens.

### CopilotKit Channels SDK
- Reference: https://docs.copilotkit.ai/reference/channels
- Direct adapters: https://docs.copilotkit.ai/reference/channels/sdk/direct-adapters
- Telegram guide: https://docs.copilotkit.ai/channels/platforms/telegram
- Install exact pair: `npm install --save-exact @copilotkit/channels@0.9.2 @copilotkit/runtime@1.70.2`
  plus `@tanstack/ai @tanstack/ai-openai` for the built-in agent. **ESM only.**
- Telegram adapter: `import { telegram } from "@copilotkit/channels/telegram"`, option `{ token }`.
  Long-polling by default (no public URL needed).
- A CopilotKit Intelligence key is required even for direct adapters (free Developer tier:
  500 channel credits total, 200 threads). Only one credential is needed: `COPILOTKIT_API_KEY`
  (`cpk-…`), from "API Keys" in your project at https://intelligence.copilotkit.ai, or via
  `npx --yes copilotkit@latest login` then `npx --yes copilotkit@latest project select`.
  The SDK defaults to the managed host (`https://api.intelligence.copilotkit.ai`,
  `wss://realtime.intelligence.copilotkit.ai`); no URL config and no licence token on managed tier.
- Runtime drives the channel (per the official channels-sdk README):
  `new CopilotRuntime({ agents: {}, intelligence: new CopilotKitIntelligence({ apiKey }), identifyUser, channels: [channel] })`
  then `createCopilotNodeListener({ runtime })`, `await listener.channels.ready({ timeoutMs: 30_000 })`,
  and assert `listener.channels.status().overall === "online"` at boot. There is no `channel.start()`.
  Call `channels.stop()` on SIGINT/SIGTERM.
- Message components (JSX): `Message, Header, Section, Markdown, Fields/Field, Image, Divider,
  Table, Actions, Button, Select, Input`. Functions: `createChannel, defineChannelTool,
  defineChannelCommand, bind, renderToIR`. Classes: `Channel, Thread, MemoryStore, Transcripts`.
- `Image` needs a publicly reachable URL.
- **Verify before building on it** (see Phase 1): (a) how to obtain a `Thread` for a known chat
  id outside an `onMessage` handler (look at `Thread`, `bind`, `Channel` reference pages);
  (b) that `Actions/Button` renders as an inline keyboard on Telegram and `onClick` fires.
  Fallback if (a) is awkward: raw Bot API `sendPhoto` + `reply_markup` + a `callback_query`
  handler — still use Channels for all conversational traffic.

### ClickHouse
- MCP server exposes list databases / list tables / run SELECT (read-only):
  https://clickhouse.com/docs/products/agentic-data-stack/components/mcp-server
  We do not need MCP; a `run_select` tool with a `readonly=1` user is equivalent and simpler.
- Node client: `@clickhouse/client`. Set `async_insert: 1, wait_for_async_insert: 1`.

### Modal (hosting) — https://modal.com/docs/reference/modal.web_server and https://modal.com/docs/guide/webhooks
- `@modal.web_server(port)` runs any HTTP server process (our Node backend via `subprocess.Popen`)
  inside the container and proxies traffic to it. WebSockets are supported with no special setup.
- Each WebSocket connection counts as one input: set `@modal.concurrent(max_inputs=200)` or Modal
  spins up a container per connection.
- **Exactly one container, always:** `min_containers=1, max_containers=1`. Two containers would
  split the in-memory session registry and make Telegram return 409 on the second long-poller.
- Env via `modal.Secret.from_name("movelog-env")`; photos on a `modal.Volume` mounted at `/photos`.
- Verify current decorator/argument names in the docs before deploying (`@modal.concurrent`,
  `scaledown_window`, `min_containers` are the 2025+ spellings; older docs use `keep_warm`,
  `container_idle_timeout`, `allow_concurrent_inputs`).

### Trigger.dev (jobs only, never the server) — https://trigger.dev/docs
- Tasks with defined start/end, retries, `wait.for`, cancellation. Used for the escalation
  timer and the durable `assessPhoto` task. Not used to host anything long-lived.

---

## 3. Stack (final)

| Layer | Choice |
|---|---|
| Voice | GPT-Live-1, Responses delegation → gpt-5.6-luna, WebRTC in browser, sideband WS on server |
| Vision | gpt-5.6-luna, structured output, reasoning none |
| Comms | Telegram via CopilotKit Channels direct adapter (one bot; ops group + customer private chats) |
| Channel agents | CopilotKit built-in TanStack AI agent, OpenAI provider, gpt-5.6-luna |
| Data | ClickHouse only (event-sourced; ReplacingMergeTree for current state) |
| Photos | Written to `PHOTOS_DIR` (local disk in dev, Modal Volume in prod) and served by the backend at `/photos/*` — must be publicly reachable for Telegram `Image` |
| Backend | One Node 22 TypeScript ESM process, Hono for HTTP, listens on `PORT` |
| Web | Next.js 15 app router: `/admin` dashboard, `/m/[token]` customer manifest, `/pack/[token]` voice page |
| Jobs | Trigger.dev: escalation timer + durable `assessPhoto` task (Phase 7, only if time) |
| Hosting | Build locally behind `cloudflared`/ngrok tunnel; deploy backend to **Modal** after Phase 5; Next.js on Vercel free tier (or a second Modal `web_server`). Tunnel stays running as demo fallback. |

---

## 4. Repo layout

```
movelog/
  package.json              npm workspaces
  modal_app.py              Modal deployment (see §4a)
  apps/
    backend/
      src/
        index.ts            boot: env check, clickhouse ping, http, channels, ready log
        env.ts              zod-validated env
        db/
          client.ts         clickhouse client
          schema.sql        DDL (idempotent CREATE TABLE IF NOT EXISTS)
          queries.ts        typed reads (FINAL) and inserts
          seed.ts           one demo move with survey + packer + ops chat
        tools/
          index.ts          registry: name → { schema, handler }; same handlers for all surfaces
          log_item.ts close_box.ts check_survey.ts flag_discrepancy.ts
          find_item.ts move_status.ts run_select.ts resolve_discrepancy.ts
          pause_logging.ts resume_logging.ts
        live/
          session.ts        POST /live/session → mint session for a move token
          sideband.ts       attach sideband WS per session; function-call loop; say(moveId, text)
          registry.ts       Map<moveId, { conn, packerId, loggingPaused }>
          prompts.ts        voice prompt + backend prompt
        vision/
          assess.ts         Luna call with JSON schema
        channels/
          telegram.tsx      createChannel + runtime + routing
          agents.ts         opsAgent, customerAgent (TanStack AI)
          cards.tsx         DiscrepancyCard component
          post.ts           postToOps(node) — thread acquisition for OPS_CHAT_ID
        http/
          photos.ts         POST /photo/:discrepancyId (multipart) → store → assess → notify
          api.ts            GET /api/move/:id, GET /api/events?move_id, GET /api/manifest/:token
          ws.ts             /pack-ws: pushes {type:"camera"} etc. to the phone
        jobs/
          escalate.ts       Trigger.dev task (Phase 7)
    web/                    Next.js
      app/admin/page.tsx
      app/admin/[moveId]/page.tsx
      app/m/[token]/page.tsx
      app/pack/[token]/page.tsx
  scripts/
    dev.sh                  starts tunnel + backend + web
  .env.example
  README.md                 write-up for submission (Phase 8)
```

Jobs folder also gets `assess_photo.ts` (durable Luna task) if Phase 7 is reached.

---

## 4a. Modal deployment (`modal_app.py`)

Backend must read `PORT` and `PHOTOS_DIR` from env and serve `PHOTOS_DIR` statically at `/photos/*`.
`npm run build` must produce `dist/index.js`.

```python
import os, subprocess, modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("curl", "ca-certificates")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
    )
    .add_local_dir("apps/backend", "/app/backend", copy=True,
                   ignore=["node_modules", "dist", ".env"])
    .run_commands("cd /app/backend && npm ci && npm run build")
)

app = modal.App("movelog")
photos = modal.Volume.from_name("movelog-photos", create_if_missing=True)

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("movelog-env")],
    volumes={"/photos": photos},
    min_containers=1,
    max_containers=1,          # in-memory session registry + single Telegram poller
    scaledown_window=60 * 60,
    timeout=60 * 60 * 24,
)
@modal.concurrent(max_inputs=200)
@modal.web_server(8080, startup_timeout=90)
def backend():
    subprocess.Popen(
        ["node", "dist/index.js"],
        cwd="/app/backend",
        env={**os.environ, "PORT": "8080", "PHOTOS_DIR": "/photos"},
    )
```

Deploy: `modal deploy modal_app.py` → URL like `https://<workspace>--movelog-backend.modal.run`.
Set that as `PUBLIC_BASE_URL` in the `movelog-env` secret and redeploy once (the backend
builds photo URLs and the customer deep link from it). Photos written to the Volume need
`photos.commit()` semantics only if written from a different function — writes from the
serving process are visible to its own reads immediately.

Next.js: Vercel free tier with `NEXT_PUBLIC_API_URL=<modal url>` (preferred), or a second
`@modal.web_server(3000)` function in the same file running `next start`.

Do not deploy before Phase 5 passes. Local + tunnel is the dev loop; Modal is the demo URL.

---

## 5. Environment variables

```
PORT=8080
PHOTOS_DIR=./photos             # /photos on Modal
OPENAI_API_KEY=
COPILOTKIT_API_KEY=            # cpk-... from intelligence.copilotkit.ai → project → API Keys
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=          # for deep links
OPS_CHAT_ID=                    # negative number; captured in Phase 1
CLICKHOUSE_URL=                 # https://...clickhouse.cloud:8443 or http://localhost:8123
CLICKHOUSE_USER= CLICKHOUSE_PASSWORD= CLICKHOUSE_DB=movelog
CLICKHOUSE_RO_USER= CLICKHOUSE_RO_PASSWORD=   # readonly=1 user for run_select
PUBLIC_BASE_URL=                # tunnel URL in dev, Modal URL in prod; https
TRIGGER_SECRET_KEY=             # Phase 7 only
```

Fail fast at boot if any required var is missing.

---

## 6. ClickHouse schema (event-sourced)

Rules: rows are immutable; current state = latest version; read with `FINAL`.

```sql
CREATE TABLE IF NOT EXISTS events (
  ts DateTime64(3), move_id String, actor_id String, actor_type LowCardinality(String), -- packer|ops|customer|system
  event_type LowCardinality(String),  -- item_logged, box_closed, defect_reported, discrepancy_opened,
                                      -- photo_received, assessment_done, decision_made, query_asked, session_started...
  box_id String DEFAULT '', item_id String DEFAULT '', discrepancy_id String DEFAULT '',
  utterance String DEFAULT '', payload String DEFAULT '{}'  -- JSON
) ENGINE = MergeTree ORDER BY (move_id, ts);

CREATE TABLE IF NOT EXISTS moves (
  move_id String, customer_name String, address String, move_date Date,
  status LowCardinality(String),       -- planned|packing|complete
  survey String,                       -- JSON array [{item, room, known_damage}]
  customer_token String, packer_token String,
  customer_chat_id String DEFAULT '', updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY move_id;

CREATE TABLE IF NOT EXISTS boxes (
  move_id String, box_id String,       -- box_id like "A12" (packer prefix + number)
  room String, fragile UInt8, high_value UInt8, status LowCardinality(String), -- open|closed
  packer_id String, updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY (move_id, box_id);

CREATE TABLE IF NOT EXISTS items (
  item_id String, move_id String, box_id String, name String, name_norm String,
  fragile UInt8, updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY item_id;

CREATE TABLE IF NOT EXISTS discrepancies (
  discrepancy_id String, move_id String, item_name String, description String,
  state LowCardinality(String),  -- awaiting_photo|assessed|confirmed|decided|dismissed
  survey_match String DEFAULT '', photo_url String DEFAULT '',
  assessment String DEFAULT '{}', -- Luna JSON
  packer_confirmed UInt8 DEFAULT 0, decision String DEFAULT '', decided_by String DEFAULT '',
  telegram_message_id String DEFAULT '', updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY discrepancy_id;
```

Box numbering: `SELECT max(toUInt32(substring(box_id, 2))) FROM boxes FINAL WHERE move_id=? AND packer_id=?` + 1,
prefixed by the packer's letter. No cross-packer coordination needed.

---

## 7. Tool contracts (shared by voice, ops, customer)

All handlers: `(args, ctx: { moveId, actorId, actorType, utterance? }) => Promise<Result>`.
Every handler inserts one `events` row. Results are **short flat JSON** for the voice path
(the Live backend paraphrases them); the same result is rendered richer in Telegram.

| Tool | Args | Returns | Exposed to |
|---|---|---|---|
| `log_item` | `{ box?: string, room?: string, items: string[], fragile?: bool, high_value?: bool }` — if `box` omitted use the packer's open box; if none open, allocate | `{ box_id, room, item_count, new_box: bool }` | voice |
| `close_box` | `{ box?: string }` | `{ box_id, item_count }` | voice |
| `check_survey` | `{ item: string, damage: string }` | `{ on_survey: bool, match?: string, confidence }` (fuzzy match on `name_norm`; use Luna `none` effort only if string match is ambiguous) | voice |
| `flag_discrepancy` | `{ item, damage }` | `{ discrepancy_id, status: "photo_requested" }` — also pushes `{type:"camera", discrepancy_id}` to phone WS | voice |
| `find_item` | `{ query }` | `{ found: bool, matches: [{ item, box_id, room, fragile }] }` (top 3, fuzzy) | voice, ops, customer (scoped) |
| `move_status` | `{}` | `{ boxes_closed, boxes_open, items, rooms_done[], rooms_pending[], open_discrepancies }` | voice, ops, customer (scoped) |
| `run_select` | `{ sql }` | `{ columns, rows (<=50) }` — readonly user, reject non-SELECT, 5s timeout | ops |
| `resolve_discrepancy` | `{ discrepancy_id, decision: wrap_and_load\|hold\|claim, by }` | `{ ok }` — then `say(moveId, "Ops says ...")` | ops (buttons) |
| `pause_logging` / `resume_logging` | `{}` | `{ paused }` — sets registry flag; phone WS mutes/unmutes mic | voice |

Customer agent: `moveId` comes from `moveForChat(chat.id)`, never from model args.

---

## 8. Prompts (starting points — keep them short)

**Voice prompt (GPT-Live instructions):**
> You are MoveLog, a hands-free assistant for a professional packer on a moving job. Site is
> noisy. Be terse and confident: acknowledge in one short sentence, never read lists back,
> no filler. Delegate anything that mentions a box, an item, a room, damage, "where is",
> "status", "pause", "resume", or "move complete" to the backend, and say "checking" only if
> it takes more than a beat. Ignore speech that is clearly not addressed to you (chatter with
> other crew). When the backend returns a result, paraphrase it in under ten words.
> Examples: "Twelve, kitchen, three items, fragile." / "Not on the survey — grab a photo."

**Backend prompt (delegation.responses.instructions):**
> You handle tool calls for a live voice conversation with a packer. Transcripts may contain
> mistakes and corrections; use the latest wording. Rules: every narrated box/item goes to
> log_item; "close", "done with", or a new box number closes the open box; any reported
> damage goes to check_survey first, then flag_discrepancy if not on survey; if an item name
> is unclear, log it as heard with fragile=false and note it — do not ask twice. Return only
> the facts the packer needs; never invent a successful write.

**Luna photo assessment (structured output schema):**
```json
{ "type":"object","additionalProperties":false,"required":["damage_type","location","severity","likely_new","claims_description","matches_known_damage"],
  "properties":{
    "damage_type":{"type":"string","enum":["scratch","dent","crack","stain","tear","break","other"]},
    "location":{"type":"string"},
    "severity":{"type":"string","enum":["cosmetic","minor","moderate","severe"]},
    "likely_new":{"type":"boolean"},
    "matches_known_damage":{"type":"string","description":"survey entry it may correspond to, or empty"},
    "claims_description":{"type":"string","description":"one sentence in insurance-claim language"} } }
```
Input: the photo + item name + the survey's known damage for that item.

**Ops agent prompt:** include the five table DDLs verbatim, "always use FINAL on
ReplacingMergeTree tables", "prefer find_item/move_status over SQL when they answer the
question", "render tabular results as a Table".

**Customer agent prompt:** friendly, only answers about their own move, never mentions other
moves, offers the manifest link.

---

## 9. Phases with acceptance checks

### Phase 0 — Scaffold (15 min)
- npm workspaces, TypeScript ESM, Hono backend, Next.js web, `.env.example`, `scripts/dev.sh`.
- `db/schema.sql` applied on boot (idempotent). `db/seed.ts` creates move `TAN-001` with a
  10-item survey (two items with known damage: "oak dresser: scratch left side",
  "dining table: chip on corner"), packer `A`, tokens.
- **Accept:** `npm run dev` boots, ClickHouse ping ok, seed visible via `GET /api/move/TAN-001`.

### Phase 1 — Telegram via Channels (BLOCKING; 30 min)
- Sign-up already done by human: Intelligence URL/key + BotFather token in `.env`.
  Human has set `/setprivacy Disable` and created the *Ops – Moves* group with the bot as admin.
- Implement `channels/telegram.tsx` per the Telegram guide. `onMessage`: log chat id and
  type; if `/start <token>` bind customer chat; else route to ops or customer agent and
  `thread.runAgent`.
- Implement `post.ts`: post a test `DiscrepancyCard` with a placeholder image and three
  buttons to `OPS_CHAT_ID`; buttons log which one was pressed.
- **Accept (all three):** (1) message in group → bot replies via agent; (2) proactive card
  appears in group with inline buttons; (3) tapping a button runs our handler. If (2)/(3)
  fail after 20 min on the Channels API, switch card posting + callbacks to raw Bot API and
  keep Channels for conversational traffic. Record `OPS_CHAT_ID` in `.env`.

### Phase 2 — Tools against ClickHouse (30 min)
- Implement all tools in §7 as plain functions with the shared handler signature.
- `scripts/tools-smoke.ts`: log 3 items into a new box, close it, find_item "blender",
  check_survey "oak dresser scratch" (true) and "sofa tear" (false), flag_discrepancy,
  resolve_discrepancy, move_status. Prints results.
- Wire `find_item`, `move_status`, `run_select` into `opsAgent`; `find_item`, `move_status`
  into `customerAgent` with scoping.
- **Accept:** smoke script passes; in the ops group "where is the blender on TAN-001?" answers
  correctly; "how many boxes are closed?" answers via run_select.

### Phase 3 — Voice session (60 min)
- `live/session.ts`: mint a Live session for a packer token with Responses delegation,
  backend `gpt-5.6-luna`, `reasoning.effort: "low"`, tools from §7 (voice set), both prompts.
  Send initial context via `session.thinking.append` (delegation_id null): move id, rooms,
  known open box.
- `live/sideband.ts`: attach sideband WS; implement the function-call loop exactly per the
  delegation doc (collect from `response.output_item.done`, `function_call_output`, then
  `response.create`); register in `registry.ts`; export `say(moveId, text)` →
  `session.commentary.append`. Handle reconnect: if WS drops, re-attach; if a tool throws,
  return `{ error, logged_as_heard: true }` and insert an `events` row with
  `event_type=needs_review` — never drop an utterance silently.
- `web/app/pack/[token]/page.tsx`: big Start/Stop, connection status, mic level, "Paused"
  banner, camera button (hidden until `{type:"camera"}` arrives), wake lock. WebRTC per the
  Live client guide. Mute the local audio track when paused.
- **Accept:** on a phone through the tunnel: "Box twelve, kitchen, glasses, blender, fragile"
  → ClickHouse rows → spoken ack under 2 s. "Where's the blender?" → "Box A12, kitchen."
  "Hold on" pauses; "okay back" resumes.

### Phase 4 — Discrepancy + photo + Luna (45 min)
- `http/photos.ts`: accept upload, store as `$PHOTOS_DIR/<id>.jpg` (served statically at `/photos/<id>.jpg`),
  call `vision/assess.ts`, insert `discrepancies` (state assessed), `say(moveId, ...)` with a
  one-liner, then post the Telegram card (Phase 1 code) with the real photo URL and assessment.
- Packer confirmation: backend prompt already handles "yes"/"no that's the old one" →
  set `packer_confirmed` / `dismissed`.
- **Accept:** "The oak dresser has a scratch on the left" → "On the survey, noted." /
  "The sofa has a tear" → camera appears → photo → spoken assessment → card in group.

### Phase 5 — Close the loop (20 min)
- Button handler → `resolve_discrepancy` → `say(moveId, "Ops says wrap and load. Claim opened.")`
  → edit/replace the card to show the decision and who made it.
- **Accept:** the full round trip on video: speak → card → tap → hear. This is the demo.
  STOP and record a rough video now before continuing.

### Phase 6 — Customer + web (45 min)
- "Move complete" voice command → `moves.status=complete`, generate deep link
  `https://t.me/<bot>?start=<customer_token>` and manifest URL; show QR on the phone page.
- `/m/[token]`: boxes grouped by room, items per box, photos, condition report with
  pre-existing vs new sections and the ops decision. Server-rendered, no client state.
- `/admin`: table of moves with status and counts; `/admin/[moveId]`: live event feed
  (poll `/api/events` every 2 s), room progress vs survey, open discrepancies. Plain Tailwind.
- **Accept:** customer chat "did my TV get packed?" answers from their move only; manifest
  renders; admin feed updates while someone speaks.

### Phase 7a — Modal deploy (do this as soon as Phase 5 passes; 20 min)
- Write `modal_app.py` per §4a. Human creates the `movelog-env` secret from `.env`.
- `modal deploy`, set `PUBLIC_BASE_URL` to the Modal URL, redeploy.
- Point the Next.js app at the Modal URL (Vercel env or second web_server).
- **Accept:** round trip from Phase 5 works against the Modal URL; photo in the Telegram
  card loads from `https://...modal.run/photos/<id>.jpg`. Keep the tunnel running as fallback.

### Phase 7b — Trigger.dev (only if 7a is done and time remains)
- `jobs/escalate.ts`: triggered on `discrepancy_opened`; `wait.for({ minutes: 3 })`; if no
  decision, re-post to the group tagging @ops; wait 3 more; post "ESCALATED" and DM a second
  contact. Cancel on `decision_made`.
- `jobs/assess_photo.ts`: `POST /photo` enqueues it; task calls Luna with retries (3, backoff),
  writes `discrepancies`, then calls backend `POST /internal/say` and `POST /internal/post-card`.
  Backend keeps the inline path as fallback if `TRIGGER_SECRET_KEY` is unset.

### Phase 8 — Submission (30 min, human + you)
- README: what it is, the round-trip diagram, stack, what was built today, how to run,
  known limitations. Add the line: *the same agent meets the packer in their earbuds, the ops
  team in their Telegram group, and the customer in a private chat with the same bot.*
- Two-minute video script: 0:00 problem, 0:20 packer narrating, 0:50 defect → photo → card,
  1:20 ops taps, packer hears, 1:40 customer asks in Telegram, 1:55 admin dashboard.

---

## 10. Engineering rules

- One process for backend. The Telegram button handler must reach the packer's live session
  through `registry.ts`; do not introduce a queue or a second service.
- Never drop an utterance: any tool failure logs an `events` row with `needs_review=1` and
  returns a short error the voice model can say ("logged as heard, flagged for review").
- Idempotency: `resolve_discrepancy` on an already-decided id is a no-op that still says the
  existing decision. Photo upload for an unknown/decided id returns 409.
- Every write to ClickHouse goes through `db/queries.ts`; every read of a Replacing table uses `FINAL`.
- Timeouts: tool handlers 5 s; Luna 15 s; on timeout follow the never-drop rule.
- Log every Live event type once at debug level on first sight so unknown events are visible.
- No auth beyond opaque tokens in URLs. Say so in README.
- Keep prompts in `prompts.ts`; do not inline them.
- Commit after every phase with the phase name.

## 11. Things the human must do (cannot be automated)

1. CopilotKit Developer signup at intelligence.copilotkit.ai → create project → copy the `cpk-…` API key.
2. BotFather: `/newbot`, `/setprivacy` → Disable. Create *Ops – Moves* group, add bot, make admin.
3. OpenAI key with access to `gpt-live-1` and `gpt-5.6-luna` (tier ≥ 1).
4. ClickHouse Cloud: service `movelog`, **Singapore region** (AWS ap-southeast-1 or GCP asia-southeast1),
   smallest size, 1 replica, **idling off**. Save the `default` password (shown once). In SQL console:
   `CREATE DATABASE IF NOT EXISTS movelog; CREATE USER movelog_ro IDENTIFIED BY '<pw>' SETTINGS readonly = 1; GRANT SELECT ON movelog.* TO movelog_ro;`
   (or `docker run -p 8123:8123 clickhouse/clickhouse-server` locally).
5. Start the tunnel and paste `PUBLIC_BASE_URL`.
6. An Android phone (iOS Safari suspends mic on lock) with earbuds, on the tunnel URL.
7. Modal: `pip install modal && modal token new`; after Phase 5,
   `modal secret create movelog-env $(grep -v '^#' .env | xargs)` (then edit `PUBLIC_BASE_URL`
   in the Modal dashboard once the URL is known).
8. Vercel login for the Next.js app, if using Vercel.
9. Trigger.dev project + `TRIGGER_SECRET_KEY` only if Phase 7b is reached.

## 12. What to cut, in order, if behind schedule

1. Trigger.dev (7b) entirely (say "escalation timer" in README).
2. Modal deploy (7a) — the tunnel is a valid deployment for the submission; commit
   `modal_app.py` anyway and say so in README.
3. Admin dashboard → keep `/admin/[moveId]` event feed only.
4. Customer manifest page → keep the customer Telegram chat only.
5. Never cut Phases 1–5.
