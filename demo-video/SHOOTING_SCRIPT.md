# MoveLog — demo video shooting script

**Runtime: 2:00.** Record only after Phase 5 passes (packer speaks → Telegram card → ops taps → packer hears).
Everything in this script is real product footage. Nothing is mocked. If a beat won't run live, cut the
beat and shorten the video — do not stage it.

---

## 0. Capture rig (set up once, 10 min)

| Source | Device | How |
|---|---|---|
| A — Packer phone | Android, `/pack/<token>` | Built-in screen recorder, audio source **"Media sounds and mic"** |
| B — Ops Telegram | Laptop, Telegram Desktop, *Ops – Moves* group | QuickTime / OBS screen record, window only |
| C — Room | Second phone on a tripod/stack of boxes | Wide shot of a person packing an actual box |
| D — Web | Same laptop, second recording: `/m/<token>` and `/admin/<moveId>` | Same as B |

**Audio decision — make it now.** The agent speaks into earbuds, so the room camera won't hear it.
Record the phone with the **speaker on and earbuds unpaired**; Android's screen recorder then captures
both your voice (mic) and the agent's replies (media). Say "earbuds" in the voiceover; show the phone
in a pocket in shot C. Do not try to record Bluetooth audio — it silently drops out and you lose the take.

**Layout for the round-trip beat (1:05–1:40):** edit A and B side by side, phone left (portrait, ~35%
width), Telegram right. This split is the whole video. Compose for it while shooting — keep the
Telegram window narrow so the card fills it.

**Burn in subtitles for every spoken line.** Venue audio is bad and judges often watch muted. Non-negotiable.

---

## 1. Pre-flight staging (do before rolling)

- [ ] Seed move `TAN-001` fresh: survey loaded, **zero** boxes, **zero** discrepancies. A clean state makes the counters move on camera.
- [ ] Survey contains `oak dresser: scratch left side` (used for the "already on the survey" beat) and does **not** contain the sofa.
- [ ] `Ops – Moves` group scrolled clean — no test cards above the fold. Delete old ones.
- [ ] One real cardboard box, tape, a blender or similar, a sofa or chair with a visible mark. Props sell it.
- [ ] Customer Telegram chat: **unstarted**. The `/start` deep link firing on camera is worth 5 seconds.
- [ ] `/admin/TAN-001` open in a background tab, event feed polling.
- [ ] Phone: Do Not Disturb on, notifications off, brightness up, screen-lock 10 min, wake lock confirmed working.
- [ ] Laptop: notifications off, Telegram set to light theme (reads better when compressed).
- [ ] Do one full dry run with no recording. Then record.

---

## 2. Shot list

Timings are targets. Total 2:00. VO = voiceover recorded afterward over the footage (do not narrate live — you need the mic clean for the agent).

### 0:00–0:16 — Hook (shot C, wide, real packing)
**On screen:** hands taping a box. No UI.
**VO:** "A packing crew logs a hundred boxes a day on paper. Ops finds out what's in them tomorrow.
And when something's already damaged, nobody knows whose fault it is until the claim lands."
**Cut on:** the packer standing up with the box, phone in their pocket.

### 0:16–0:26 — The setup line (shot C → A)
**VO:** "MoveLog is one agent that lives in three places. The packer's earbuds. The ops team's
Telegram group. And the customer's chat."
**On screen:** quick push into the phone screen — `/pack/TAN-001`, big **Start** button, tap it, status goes green.

### 0:26–0:52 — Voice logging (shot A full frame, phone audio up)
Speak these lines exactly. They are rehearsed because the agent handles them cleanly — improvise on
demo day and you'll get a re-ask on camera.

| You say | Agent should say | Why it's in the cut |
|---|---|---|
| "Box twelve, kitchen. Glasses, the blender, two chopping boards. Fragile." | "Twelve, kitchen, three items, fragile." | The core loop, under two seconds |
| "Actually put the phone chargers in that one too." | "Added, four items." | **Mid-flow correction** — proves it's not a form |
| "Where did the router go?" | "Box A9, study." | Retrieval, hands never leave the tape gun |

**VO (over the top, sparse):** "No app to tab through, no form. He talks, it writes — and it can answer back."
**Cut on:** the `/admin` event feed in a corner inset, rows appearing as he speaks. 3 seconds of inset is enough.

### 0:52–1:10 — Damage, and the survey check (shot A, then the camera button)
| You say | Agent should say |
|---|---|
| "The oak dresser has a scratch on the left side." | "Noted — that one's on the survey." |
| "The sofa has a tear on the back cushion." | "Not on the survey. Grab a photo." |

**On screen:** camera button appears on the phone page. Tap. Photograph the actual mark on the actual sofa.
**Agent:** "Six-inch tear, minor, looks new. Logging it."
**VO:** "Pre-existing damage it recognises from the survey. New damage, it doesn't — so it asks for a photo,
reads it, and escalates."

### 1:10–1:28 — The card lands (SPLIT SCREEN A | B — this is the shot)
**On screen:** left, the phone still on the voice page. Right, the Telegram group — the card drops in live:
photo, assessment, severity, "On survey: No", and three buttons.
**Do not cut away.** Let it land in real time. If the gap is >4s, speed-ramp it, don't hide it.
**VO:** "Ops didn't open a dashboard. The card came to where they already are."

### 1:28–1:42 — The round trip closes (split screen held)
**On screen:** cursor moves to **Wrap and load**, clicks. Card updates in place with the decision and who made it.
Roughly a second later — left side — the packer's phone is speaking.
**Agent:** "Ops says wrap and load. Claim opened."
**VO:** "Twelve seconds, start to finish. Nobody typed anything, and nobody put the box down."
**Editing note:** put a running timer overlay from the moment the tear is spoken to the moment the packer
hears the decision. The number is the argument.

### 1:42–1:52 — Customer (shot D, then a phone)
**On screen:** "Move complete" spoken → QR on the packer's phone → customer's Telegram opens via deep link →
customer types **"did my TV get packed?"** → answer: box, room, fragile flag. Then a 2-second pan of `/m/<token>`:
boxes by room, condition report split pre-existing / new, ops decision showing.
**VO:** "At handover the customer gets the same bot — scoped to their move only — and a manifest of every box."

### 1:52–2:00 — Close (shot D, `/admin/TAN-001`)
**On screen:** event feed, every utterance timestamped, the ClickHouse rows behind it.
**VO, verbatim — this is the judging line:**
"Same agent, same tools, same state. It meets the packer in their earbuds, the ops team in their Telegram
group, and the customer in a private chat — and no chatbox could carry that round trip alone."

---

## 3. Take order (shoot out of sequence — it's safer)

Record in this order so that if you run out of time, what you have is still cuttable:

1. **Take 1 — the round trip, 0:52 → 1:42 in one unbroken run.** Both screens rolling. This is the video.
   Get it three times. If you only have this, you have a submission.
2. **Take 2 — voice logging, 0:26–0:52.** Also unbroken; re-roll rather than splicing individual lines.
3. **Take 3 — customer + manifest.**
4. **Take 4 — admin feed, room B-roll, hero shots of the phone and the box.**
5. **VO last,** in the quietest corner you can find, phone mic 10cm away, one continuous read per section.

---

## 4. If something breaks while recording

| Breaks | Do this |
|---|---|
| Agent mishears a line | Re-roll the whole take. Never cut mid-sentence to hide it — it reads as editing around a failure. |
| One agent re-ask ("say that again") | **Keep it.** One recovery on camera is credibility, not a flaw. Two is a pattern — re-roll. |
| Telegram card slow (>8s) | Keep shooting, speed-ramp in the edit, and say the real latency in the README. Don't cut the gap out silently. |
| Card never arrives | Stop. Fix it. There is no version of this video without beat 1:10. |
| Luna returns nonsense on the photo | Re-shoot the photo with better light. Do not hand-edit the assessment text. |
| Customer chat or manifest not built | Cut 1:42–1:52 entirely, extend the close. A 1:50 video is fine; a fake one is not. |
| Modal deploy not done | Shoot against the tunnel. Say "running locally behind a tunnel" in the README, not in the video. |

---

## 5. Edit checklist

- [ ] Under 2:00 hard.
- [ ] Subtitles on every spoken line, agent lines visually distinct from packer lines.
- [ ] Timer overlay on the round trip.
- [ ] No dead air over 1.5s — tighten, don't speed up speech.
- [ ] First 10 seconds work muted.
- [ ] Title card at 0:00 with the project name; end card with the repo URL.
- [ ] Export 1080p, H.264, upload unlisted, put the link in the README and the submission form.
- [ ] Watch it once at 2x with sound off, and once with sound on at normal speed, before submitting.

## 6. Things to say in the write-up, not in the video

Latency numbers, the Channels-vs-raw-Bot-API fallback if you took it, the ClickHouse event-sourced schema,
the Modal single-container constraint, and every known limitation. The video shows; the README explains.
