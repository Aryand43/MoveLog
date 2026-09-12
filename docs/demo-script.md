# Two-minute demo script

Two devices. The **phone** runs `/pack/pack-tan001` (Android, earbuds in, page in the
foreground — backgrounding it tears down WebRTC). A **laptop** shows the Telegram group and
`/dashboard` side by side. Ops taps on the laptop, never on the packer's phone.

Reset to a clean move first: `npx tsx apps/backend/scripts/reset-demo.ts`

| Time | On screen | Say |
|---|---|---|
| 0:00 | Packer's phone, hands full | "Movers notice everything and write down almost none of it. The survey says the dresser was already scratched. Nobody remembers which box the chargers went in." |
| 0:15 | Press Start, chip goes `live` | "One phone in the pocket, earbuds in. The agent is listening." |
| 0:25 | Speak; console feed moves | **"Box twelve, kitchen, glasses, blender, fragile."** — "That's in ClickHouse before I finish the sentence, and the ops console is reading the same row." |
| 0:40 | Ask it | **"Where's the blender?"** → *"Box A12, kitchen."* |
| 0:50 | Pre-existing damage | **"The oak dresser has a scratch on the left side."** → *on the survey, noted.* "No card, no escalation. It checks the pre-move survey first." |
| 1:05 | New damage | **"The sofa has a tear on the left armrest."** → camera appears. Photograph it. |
| 1:20 | Laptop: card lands | "The vision model assessed the photo and wrote the claim sentence. This card is in the ops group." |
| 1:35 | **Tap a decision** | Packer's earbuds: *"Ops says wrap it and load it."* — "That's the loop: spoken in a warehouse, decided in a group chat, back in their ears in seconds." |
| 1:50 | Telegram, customer chat | **"Did my blender get packed?"** → answers from their move only. |
| 1:58 | Console + manifest | "Same agent, three surfaces. One event log underneath." |

## The line to land

> The same agent meets the packer in their earbuds, the ops team in their Telegram group, and
> the customer in a private chat with the same bot.

## If something fails on stage

- **Chip stuck on `connecting`** — the page reports the real reason now; read it out. Switch to
  wifi you control and press Start once.
- **No audio** — tap "Enable sound" if it appears; check the earbuds were connected *before*
  Start.
- **Session dies mid-demo** — it closed because the page lost focus or the network dropped.
  Press Start again; the log is already in ClickHouse, so nothing narrated is lost.
- **Nothing to fall back on is needed for the data** — `/dashboard` and `/m/cust-tan001` read
  from ClickHouse and keep working even if the voice session is down.
