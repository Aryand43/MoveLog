# MoveLog — judge demo script

**Format:** judges come to your corner, 15:30–16:30, ~7 min each. Finalists pitch 3 min + 3 min Q&A at 16:30.
**One-line pitch:** *The agent rides in a packer's earbuds, posts to the ops Telegram group, and answers the customer in their own chat — the same agent, the same tools, the same state.*

The spine of this demo is **one round trip**: the packer speaks, a card lands in Telegram, an ops person taps a button, and the packer hears the answer. Everything else is supporting cast. If you have 90 seconds, do only that.

---

## 0. Pre-flight (do before the first judge arrives)

- [ ] Backend up on Modal. `curl $MODAL_URL/health` returns `{"ok":true}`.
- [ ] Ops Telegram group open on the **laptop**, scrolled clean. Delete old test cards.
- [ ] Packer phone on `/pack/pack-tan001`, earbuds in, **screen-lock off**, Do Not Disturb on.
- [ ] Second phone logged into Telegram as the customer, chat **unstarted** (so the `/start` deep link fires live).
- [ ] Console open in a browser tab at `/dashboard`.
- [ ] Know your two magic items: **oak dresser** is on the survey with "scratch left side". **Leather sofa** is on the survey with *no* known damage. That contrast is the whole demo.
- [ ] Have the 2-minute video queued as a fallback if the venue wifi dies.

**Speak the setup in one breath, not three:** "Moving crews log boxes on paper. Ops finds out tomorrow. When something's already damaged, nobody knows whose fault it is until the claim lands."

---

## 1. The corner demo (6 minutes)

### Beat 1 — Hand a judge the earbuds (0:00–1:30)

> **Do this first.** Don't describe the voice agent. Put it in their ears.

Give a judge one earbud and the phone. Ask them to say, in their own words:

> "Box twelve, kitchen. Glasses, the blender, two chopping boards. Fragile."

They hear back: *"Twelve, kitchen, three items, fragile."* Point at the console — the box appeared, the event feed moved.

Then ask them to interrupt themselves:

> "Actually put the phone chargers in that one too."

**Say:** "That's not a form. He never took his hands off the tape gun."

Then let them ask it something:

> "Where did the router go?"

**Say:** "Same tool the customer will call in a minute. One registry, three callers."

### Beat 2 — Survey match vs. new damage (1:30–2:45)

Ask the judge to report damage that *is* on the survey:

> "The oak dresser has a scratch on the left side."

Agent: *"Noted, that one's on the survey."* Nothing escalates.

Now damage that is **not**:

> "The leather sofa has a tear on the back cushion."

Agent: *"Not on the survey. Grab a photo."* The camera button appears on the phone.

**Say:** "It checked the pre-move survey before deciding this was worth anyone's time. Pre-existing damage doesn't wake the ops team."

### Beat 3 — Photo, assessment, and the card (2:45–4:00)

Let the judge take the photo of whatever prop you have. Then **stop talking and let it land.**

One request does the whole chain: store the image, call GPT‑5.6 Luna with a JSON schema, speak the verdict into the earbuds, and post the card to Telegram.

The judge hears: *"Six-inch tear, minor, looks new. Logging it."*
On the laptop, the card appears: photo, assessment, severity, survey verdict, and three buttons.

**Say:** "The photo never goes into the voice session — GPT‑Live‑1 takes no images. It goes to Luna, and the text comes back into the conversation."

### Beat 4 — The round trip closes (4:00–5:00) ← **this is the demo**

**Ask the judge to tap the button themselves**, on the laptop or their own phone if they're in the group.

They tap **Wrap and load**. Within a couple of seconds the packer's earbuds say:

> *"Ops says wrap and load. Claim opened."*

The card rewrites itself in place with the decision and who made it.

**Say, once, plainly:** "Nobody opened a dashboard. Nobody typed. That round trip is the thing a chatbox can't do — it needs two people in two different places, each in the tool they're already in."

### Beat 5 — Ops asks the database a question (5:00–5:30)

In the ops group, type:

> "How many fragile boxes on TAN-001?"

It answers from ClickHouse. **Say:** "Read-only user, SELECT-only. The ops team queries the event log in the same thread where the cards land."

### Beat 6 — The customer (5:30–6:00)

Scan the handover QR with the second phone. The `/start` deep link binds that chat to the move. Ask it:

> "Did my TV get packed?"

**Say:** "Same bot, same tools, scoped to one move. The customer can't see another customer's move, and the model never gets a move ID as an argument — it's bound from the chat."

---

## 2. What to say when they ask "what's actually built?"

Be straight. It scores better than hedging.

| Works live | Status |
|---|---|
| Voice logging, corrections, retrieval | Working end to end |
| Survey check, discrepancy, photo, Luna assessment | Working end to end |
| Telegram card, buttons, decision spoken back | Working end to end |
| Ops natural-language queries over ClickHouse | Working |
| Customer deep link and scoped Q&A | Working |
| Web console (dashboard, review, manifest) | Working, on local mock state |
| Escalation timer (Trigger.dev) | Not built. Say so. |

**Do not claim the console is wired to the backend.** It runs on mock state for demo reliability. If asked: "The console is the ops surface we'd ship; today it runs on seeded state so it demos the same way every time. The live surfaces are the earbuds and Telegram."

---

## 3. Q&A prep (grounded in the code)

**"Isn't this just a voice wrapper on a chatbot?"**
No. The voice model holds no tools. It delegates every call to a backend agent over a sideband WebSocket, and that backend is the same tool registry the Telegram agents call. `find_item` and `move_status` are literally the same handlers on all three surfaces.

**"What happens when the network drops mid-move?"**
The sideband reconnects, up to five attempts. A tool failure never drops an utterance — it writes a `needs_review` event and returns a short error the voice model can say out loud. The rule is that the packer always gets told, never silently ignored.

**"What stops a customer seeing another customer's move?"**
The move ID is never a model argument on the customer surface. It's resolved from the Telegram chat ID via `moveForChat()` and injected into the tool context. The model cannot ask for a different one.

**"Double-tap on the button?"**
`resolve_discrepancy` is idempotent. A second tap re-states the standing decision rather than overwriting it.

**"Why Telegram and not Slack?"**
CopilotKit Channels direct adapter, one bot token, long-polling, no public webhook or workspace admin. WhatsApp and Slack are adapter swaps in the same `createChannel` call. Ops group and customer DM share one process, routed on chat ID.

**"Why ClickHouse for a hundred boxes?"**
It's event-sourced, not a CRUD app. Every utterance and tool call is an immutable row with the raw transcript. Current state is a query with `FINAL`, not a mutable table. That's the audit trail a damage claim is argued from six weeks later.

**"How do you handle two packers?"**
Box IDs are prefixed per packer (A12, B7), so two crews never collide and need no coordination. That's also how real crews label.

---

## 4. Rubric map (what each beat is buying you)

| Criterion | The beat that earns it |
|---|---|
| **Core requirements & functionality** | Beats 1–4 run live, end to end, in front of them. Let the judge drive. |
| **Innovation & theme alignment** | Beat 4. Say the "two people, two places" line out loud — don't let them infer it. |
| **Technical execution** | The Q&A answers: sideband reconnect, idempotency, never-drop-an-utterance, chat-bound scoping, event sourcing. |
| **Usefulness & agentic experience** | Beat 2. The agent *declines* to escalate pre-existing damage. Restraint reads as judgement. |

---

## 5. If something breaks

| Breaks | Do |
|---|---|
| Voice won't connect | Go straight to the ops group. Type a question, show the tools answering. Then play the video. |
| Card doesn't arrive | Say the real latency, don't wait in silence. Show `/internal/test-card` posting a card, then move to Beat 5. |
| Luna returns nonsense | Re-shoot with better light. Never edit the assessment text in front of a judge. |
| Wifi dies entirely | Play the 2-minute video, then walk the architecture on the whiteboard. The Q&A answers still score. |

**One recovery on camera is credibility. Two is a pattern.** If the second thing fails, stop demoing and talk architecture.

---

## 6. Finalist pitch (3 min), if you make it

- **0:00–0:20** The problem, in one breath. Paper, tomorrow, the claim.
- **0:20–1:40** The round trip, live. Beat 1 compressed, then Beats 3 and 4 in full.
- **1:40–2:20** Same agent, three surfaces. One registry, chat-bound scoping, event-sourced log.
- **2:20–3:00** Close: *"It meets the packer in their earbuds, ops in their Telegram group, and the customer in a private chat. No chatbox could carry that round trip alone."*

Leave the round trip on screen when you stop talking.
