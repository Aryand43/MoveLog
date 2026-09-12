# MoveLog — 3-minute demo script

**One line:** *The agent rides in a packer's earbuds, posts to the ops Telegram group, and answers the customer in their own chat. Same agent, same tools, same state.*

At 180 seconds the whole demo is **one round trip**: the packer speaks, a card lands in Telegram, ops taps a button, the packer hears the answer. Everything else is one sentence, not a beat.

**Budget:** ~250 words of narration. That is deliberate. The remaining 60 seconds are live action and silence, and the silence is what sells it. If you are still talking while the card lands, you have wasted the moment.

---

## 0. Pre-flight — stage it, do not perform it

The single biggest 3-minute mistake is demoing from a cold start. Pre-warm everything:

- [ ] Backend live: `curl $MODAL_URL/health` returns `{"ok":true}`.
- [ ] **17 boxes already logged.** Progress must look like a real morning's work, not an empty app.
- [ ] Ops Telegram group open on the laptop, scrolled clean, old cards deleted.
- [ ] Packer phone on `/pack/pack-tan001`. Earbuds in **one ear** so you can still hear judges. Screen-lock off, Do Not Disturb on.
- [ ] **Second phone: customer chat already open with the TV answer on screen.** You will hold it up for 8 seconds, not demo it live.
- [ ] Damage prop within arm's reach. Know where the light is.
- [ ] Video queued as a fallback.

Rehearse the cut twice with a timer. Not the words, the *transitions*.

---

## 1. The script

### 0:00–0:15 — The problem (two sentences, then stop)

> "A packing crew logs a hundred boxes a day on paper. Ops finds out what's in them tomorrow, and when something's already damaged, nobody knows whose fault it is until the claim lands."

Do not explain the product. Go straight to using it.

### 0:15–0:45 — It logs by voice

Phone in pocket. You speak, normally, not to a demo:

> "Box eighteen, kitchen. Glasses, the blender, two chopping boards. Fragile."

Agent: *"Eighteen, kitchen, three items, fragile."*

Then interrupt yourself mid-flow:

> "Actually put the phone chargers in that one too."

Agent: *"Added, four items."*

> "That's a conversation, not a form. His hands never left the tape gun."

### 0:45–1:25 — It knows what is already broken

First, damage that **is** on the pre-move survey:

> "The oak dresser has a scratch on the left side."

Agent: *"Noted, that one's on the survey."*

> "Nothing happens. That damage was already recorded before we arrived."

Now damage that **is not**:

> "The leather sofa has a tear on the back cushion."

Agent: *"Not on the survey. Grab a photo."*

> "It checked the survey before deciding this was worth anyone's time."

### 1:25–1:55 — Photo, assessment, card

Take the photo. **Then stop talking.**

One request stores the image, calls GPT‑5.6 Luna with a JSON schema, speaks the verdict into the earbuds, and posts to Telegram.

Earbuds: *"Six-inch tear, minor, looks new. Logging it."*
Laptop: the card lands with photo, assessment, severity, survey verdict, three buttons.

Only once it is on screen:

> "The photo never enters the voice session. GPT‑Live‑1 takes no images, so it goes to Luna and the text comes back into the conversation."

### 1:55–2:25 — The round trip closes ← **the demo**

**Hand the laptop to a judge. Ask them to tap "Wrap and load."**

This is your one interactive moment. It costs five seconds and it is the emotional beat: their tap, your earbuds.

Two seconds later, out loud:

> *"Ops says wrap and load. Claim opened."*

The card rewrites itself with the decision and who made it.

> "Nobody opened a dashboard. Nobody typed. Two people, in two different tools, and neither of them left the one they were already in."

### 2:25–2:40 — The third surface (hold up the phone, do not demo)

Hold up the pre-staged customer phone.

> "At handover the customer gets the same bot in their own chat, scoped to their move. 'Did my TV get packed?' — box, room, fragile flag. Same tools the packer just used. The model never gets a move ID as an argument; it's bound from the chat, so no customer can see another's move."

### 2:40–3:00 — Close

> "One agent, three surfaces. The packer's earbuds, the ops Telegram group, the customer's private chat. Every utterance is an immutable row in ClickHouse, so a damage claim six weeks from now can be argued from the transcript. No chatbox could carry that round trip alone."

**Leave the card on screen when you stop talking.**

---

## 2. Cut rules, in order

If you are behind at 1:25, cut in this order. Never cut the round trip.

1. The customer phone (2:25). Fold it into the close as one clause.
2. The mid-flow correction (0:30). Log the box and move on.
3. The oak dresser (0:45). Go straight to the sofa. **Costs you the restraint point** — only if desperate.
4. The problem statement down to one sentence.

---

## 3. Q&A (you get ~3 minutes of this)

**"Isn't this a voice wrapper on a chatbot?"**
The voice model holds no tools. It delegates every call over a sideband WebSocket to a backend agent, and that backend is the same registry the Telegram agents call. `find_item` and `move_status` are the same handlers on all three surfaces.

**"What if the network drops mid-move?"**
The sideband reconnects, five attempts. A tool failure never drops an utterance: it writes a `needs_review` event and returns a short error the voice model says out loud. The packer is always told.

**"Could a customer see another customer's move?"**
No. The move ID is never a model argument on that surface. It resolves from the Telegram chat ID via `moveForChat()` into the tool context.

**"What if ops taps twice?"**
`resolve_discrepancy` is idempotent. The second tap re-states the standing decision rather than overwriting it.

**"Why Telegram, not Slack?"**
Direct CopilotKit Channels adapter: one bot token, long-polling, no webhook or workspace admin. Slack and WhatsApp are adapter swaps in the same `createChannel` call. The ops group and every customer DM share one process, routed on chat ID.

**"Why ClickHouse for a hundred boxes?"**
It is event-sourced, not CRUD. Every utterance and tool call is an immutable row carrying the raw transcript. Current state is a `FINAL` query, not a mutable table. That is the audit trail a claim is argued from.

**"What isn't built?"**
The Trigger.dev escalation timer. And the web console runs on seeded state, not the backend — the live surfaces are the earbuds and Telegram. Say this plainly; volunteering it costs less than being caught.

---

## 4. If it breaks

At three minutes there is no recovery time. One failure, one pivot, keep moving.

| Breaks | Do |
|---|---|
| Voice won't connect | Straight to the ops group: type "how many fragile boxes on TAN-001?" and let the tools answer. Then the close. |
| Card doesn't arrive in 8s | Say the real latency out loud, keep going, show the card when it lands. Never wait in silence for a thing that may not come. |
| Two things fail | Stop demoing. Play the video and spend the rest on architecture. The Q&A answers still score. |

---

## 5. If you get a longer corner slot

Same spine, expanded. Add in this order: hand a judge the earbuds and let them log a box in their own words (the strongest interaction you have, but too risky at 3 min); let them ask "where did the router go?"; type a natural-language query in the ops group and let it hit ClickHouse; scan the handover QR live instead of pre-staging it.
