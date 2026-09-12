# MoveLog / MoveMate

Hackathon build: a voice agent for movers and packers. One agent on three surfaces —
the packer's earbuds (GPT‑Live‑1), the ops team's Telegram group (CopilotKit Channels),
and the customer's private chat — over an event-sourced ClickHouse store.

Build plan: `PLAN.md` (not yet committed — see Downloads).

## Video

| Path | What |
|---|---|
| [`video/`](video/) | HyperFrames project — the animated walkthrough, source and render |
| [`video/renders/movemate-walkthrough.mp4`](video/renders/movemate-walkthrough.mp4) | 2:01 · 1920×1080 · 30fps · silent, burned-in captions |
| [`video/build.mjs`](video/build.mjs) | Generates `index.html`; all copy and timings live in the DATA blocks at the top |
| [`docs/DEMO_VIDEO.md`](docs/DEMO_VIDEO.md) | Shooting script for the **real** demo video, once the product runs |

The walkthrough is an **animated illustration of the concept**, not a recording of a working
build — the title card says so on screen and the damage photo is labelled as an illustration.
Use it as a pitch/explainer piece or as B-roll. The real demo gets shot per `docs/DEMO_VIDEO.md`.

### Rebuilding the video

```bash
cd video && node build.mjs && npx hyperframes check && npx hyperframes render --quality high
```

`check` must pass clean (lint + runtime + layout + motion + WCAG contrast) before rendering.
Preview while iterating with `npx hyperframes preview --background`.
