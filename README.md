# MoveLog

**One agent, three surfaces: the packer's earbuds, the ops team's Telegram group, and the
customer's private chat with the same bot.**

Movers pack with both hands full. Everything they notice — what went in which box, a tear on
a sofa that wasn't on the pre-move survey — is remembered until someone can write it down,
and most of it never is. MoveLog is a voice agent that keeps a phone in the packer's pocket
and turns narration into an append-only record, then carries the one decision that can't wait
to the people who can make it.

## The round trip

This is the whole product in one loop, and every leg of it is live:

```
packer speaks  ──▶  GPT-Live-1  ──▶  delegated tools  ──▶  ClickHouse
"the sofa has a tear"       │                                    │
                            │         not on the survey          ▼
       phone camera  ◀──────┘                            gpt-5.6-luna
            │                                          assesses the photo
            ▼                                                    │
     photo uploaded  ──────────────────────────────────▶  card in Telegram
                                                                 │
       packer hears  ◀── "Ops says wrap it and load it" ◀── ops taps a button
```

Speak → card → tap → hear. Measured end to end on the deployed stack: tool calls return in
0.7–1.4s, photo assessment in ~2.4s.

## What it does

- **Hands-free logging.** "Box twelve, kitchen, glasses, blender, fragile." Naming a new box
  closes the open one. "Hold on" mutes the mic so crew chatter never reaches the log.
- **Damage that knows the difference.** Reported damage is checked against the pre-move survey
  first. A scratch already on the survey is acknowledged and dropped; anything new opens a
  discrepancy and pops the camera on the packer's phone.
- **Assessment, not transcription.** The photo goes to a vision model with the item name and
  the survey's known damage, and comes back as structured JSON including a sentence in
  insurance-claim language.
- **A decision loop that closes.** Ops tap a button in Telegram — or in the console — and the
  packer hears the answer in their earbuds seconds later.
- **Ask the data anything.** Ops query in plain English in their group chat; `find_item` and
  `move_status` answer the common questions and read-only SQL covers the rest.
- **The customer gets the same bot.** A deep link at handover binds their chat to their move,
  scoped so they only ever see their own.

## Stack

| Layer | Choice |
|---|---|
| Voice | GPT-Live-1, WebRTC straight from the browser, Responses delegation to `gpt-5.6-luna` |
| Steering | Server-side sideband WebSocket — this is how an ops decision becomes speech |
| Vision | `gpt-5.6-luna`, structured output, `reasoning.effort: none` |
| Comms | CopilotKit Channels, Telegram direct adapter — one bot, group and private chats |
| Data | ClickHouse, event-sourced; `ReplacingMergeTree` read with `FINAL` |
| Backend | One Node 22 / Hono process on **Modal**, pinned to `ap-southeast` |
| Web | Next.js 15 on Vercel |

## Engineering notes

**One process, on purpose.** The Telegram button handler reaches the packer's live session
through an in-memory registry — no queue, no second service. That forces `min_containers=1,
max_containers=1` on Modal: two containers would split the registry and the second Telegram
long-poller would get 409s. WebSockets are long-lived inputs, so `@modal.concurrent(max_inputs=200)`
keeps them sharing one container.

**Never drop an utterance.** Any tool failure — bad arguments, a timeout, a ClickHouse blip —
still writes an `events` row marked `needs_review` and returns a short string the voice model
can say. The packer is told what actually happened; the agent never claims a write that didn't
land.

**Degrade in the right direction.** No live session? `say()` logs instead of throwing, so ops
tools work identically when nobody's wearing the earbuds. Assessment failed? The photo is still
stored and the card still posts, without the model's read. Card failed to post? The packer's
upload still succeeds — they're standing there waiting.

**Idempotency where it's actually needed.** A second tap on a decided card re-states the
standing decision rather than overwriting it. Telegram's `callback_query` carries no event id,
so this is load-bearing, not decorative.

**Co-located with the data.** ClickHouse Cloud is in `asia-southeast1`; the container is pinned
to `ap-southeast`, cutting the database's share of a tool call from ~350ms to ~80ms. `log_item`
went from five sequential round trips to two.

## Running it

```sh
cp .env.example .env          # fill in the keys
npm install
npm run deploy                # backend → Modal
npm -w @movelog/web run dev   # web → localhost:3000
```

`docs/frontend-deploy.md` covers Vercel. `docs/api-notes.md` records the API details we
verified against the packages and live docs, several of which contradict what the docs pages
say — worth reading before changing the Live or Channels code.

Surfaces: `/pack/<packer_token>` (Android + earbuds), `/dashboard` (ops), `/m/<customer_token>`
(customer).

## Known limitations

- **No auth.** Every surface is addressed by an opaque token in the URL, and the ops console is
  unauthenticated. Auth0 on `/dashboard` is the obvious next step; the customer manifest should
  stay link-addressed.
- **`packer_id` is hardcoded to `"A"`.** The schema does per-packer box numbering and the audit
  trail has a real `actor_id` field, but both are fed a constant until there's a login.
- **Discrepancies carry no `box_id`.** The box is inferred by matching the item name, so damage
  to something never logged as an item shows no box.
- **No escalation timer.** Trigger.dev was scoped out; an undecided discrepancy waits
  indefinitely rather than escalating.
- **iOS suspends the mic on lock.** The packer page takes a screen wake lock; use Android.
