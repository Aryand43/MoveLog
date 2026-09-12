# demo-video

Everything to do with the MoveMate video lives here. No app code.

| Path | What |
|---|---|
| `MoveMate-walkthrough.mp4` | **The deliverable.** 2:01 · 1920×1080 · 30fps · H.264 + silent AAC track |
| `build.mjs` | Generates `index.html`. All copy and timings live in the DATA blocks at the top |
| `index.html` | Generated HyperFrames composition — do not hand-edit, it gets overwritten |
| `SHOOTING_SCRIPT.md` | Shot-by-shot script for the **real** demo video, filmed off the running product |
| `snapshots/` | Verification stills + contact sheet |
| `renders/` | Render output (gitignored — regenerable) |

## What the walkthrough is, and isn't

It's an **animated illustration of the concept** — every screen is drawn, not recorded. The
title card says "Animated product walkthrough" on screen and the damage photo is labelled
"illustration", deliberately. Use it as a pitch/explainer piece or as B-roll.

It is **not** a demo of the working build, and shouldn't be submitted as one — the judging
rubric rewards a working end-to-end agent, and now that Phases 0–4 are merged there's real
software to film. That's what `SHOOTING_SCRIPT.md` is for.

The walkthrough is also **silent**. The voiceover lines are in `SHOOTING_SCRIPT.md` §2, timed
to these exact beats; captions are burned in so it works muted either way.

## Rebuilding

```bash
cd demo-video && node build.mjs && npx hyperframes check && npx hyperframes render --quality high
```

`check` must pass clean — lint, runtime, layout, motion, and WCAG AA contrast — before rendering.
It currently does: 0 errors, 102/102 text checks. Iterate with `npx hyperframes preview --background`.

To refresh the committed deliverable after a render (adds the silent audio track players expect):

```bash
ffmpeg -y -i renders/movemate-walkthrough.mp4 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart MoveMate-walkthrough.mp4
```

Requires Node 22+ and FFmpeg. The HyperFrames agent skills are installed globally
(`npx hyperframes skills update`); `CLAUDE.md` / `AGENTS.md` here are HyperFrames' own docs.
