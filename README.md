# MoveLog / MoveMate

A voice agent for movers and packers. One agent on three surfaces — the packer's earbuds
(GPT‑Live‑1), the ops team's Telegram group (CopilotKit Channels), and the customer's private
chat — over an event-sourced ClickHouse store.

The packer narrates what they pack. Damage that isn't on the pre-move survey gets photographed,
assessed by GPT‑5.6 Luna, and posted to the ops Telegram group as a card with buttons; the ops
decision is spoken back into the packer's live session seconds later.

Build plan and phase order: [`PLAN.md`](PLAN.md). Verified API notes: [`docs/api-notes.md`](docs/api-notes.md).

## Layout

| Path | What |
|---|---|
| `apps/backend` | Node/TS service — tools, ClickHouse, Telegram channel, live voice session, photo assessment |
| `apps/web` | Next.js — `/pack/[token]` voice page, `/admin` dashboard, `/m/[token]` customer manifest |
| `modal_app.py` | Modal deployment (single container — in-memory session registry + one Telegram poller) |
| `demo-video/` | The walkthrough video, its source, and the shooting script for the real demo |

## Running

```bash
./scripts/dev.sh backend   # modal serve — public HTTPS + hot reload, prints the URL
./scripts/dev.sh web       # next dev on :3000
./scripts/dev.sh local     # backend on localhost:8080 (no public URL, no phone)
```

Copy `.env.example` to `.env` first. No auth beyond opaque tokens in URLs.
